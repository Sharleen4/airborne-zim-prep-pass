import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const INTEGRATION_ID  = Deno.env.get("PAYNOW_INTEGRATION_ID");
const INTEGRATION_KEY = Deno.env.get("PAYNOW_INTEGRATION_KEY");
const MERCHANT_EMAIL  = Deno.env.get("PAYNOW_MERCHANT_EMAIL");

const CLOUDFLARE_WORKER_URL = "https://zamaaiproxy.sharleenbwakura.workers.dev/initiate";

const PLANS = {
  // Legacy plans (kept for backwards compatibility with existing subscribers)
  "monthly":         { amount: 3.50,  description: "Zamaai Standard Monthly Access",          is_premium: false, is_family: false, max_children: 1 },
  "termly":          { amount: 12.00, description: "Zamaai Standard Termly (4-Month) Access", is_premium: false, is_family: false, max_children: 1 },
  "annual":          { amount: 30.00, description: "Zamaai Standard Full Year Access",        is_premium: false, is_family: false, max_children: 1 },
  "premium_monthly": { amount: 5.00,  description: "Zamaai Premium Monthly Access",           is_premium: true,  is_family: false, max_children: 1 },
  "premium_termly":  { amount: 18.00, description: "Zamaai Premium Termly (4-Month) Access",  is_premium: true,  is_family: false, max_children: 1 },
  "premium_annual":  { amount: 45.00, description: "Zamaai Premium Full Year Access",         is_premium: true,  is_family: false, max_children: 1 },

  // New pricing tiers (2026)
  "monthly_premium": { amount: 4.00,  description: "Zama AI Premium — Monthly",               is_premium: true,  is_family: false, max_children: 1 },
  "quarterly":       { amount: 12.00, description: "Zama AI Quarterly — One Term",            is_premium: true,  is_family: false, max_children: 1 },
  "yearly_premium":  { amount: 30.00, description: "Zama AI Premium — Full Year (Best Value)",is_premium: true,  is_family: false, max_children: 1 },
  "family_quarterly":{ amount: 20.00, description: "Zama AI Family — Quarterly (up to 4 kids)",is_premium: true, is_family: true,  max_children: 4 },
  "family_yearly":   { amount: 50.00, description: "Zama AI Family — Yearly (up to 4 kids)",  is_premium: true,  is_family: true,  max_children: 4 },
};

function formatPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("263")) return digits;
  if (digits.startsWith("0")) return "263" + digits.slice(1);
  return "263" + digits;
}

async function generateHash(fields) {
  const str = Object.values(fields)
    .filter(v => v !== "" && v !== null && v !== undefined)
    .join("") + INTEGRATION_KEY;
  const encoded = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-512", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { plan, phone, customer_name, teacher_referral_code } = await req.json();
    if (!PLANS[plan]) return Response.json({ error: "Invalid plan" }, { status: 400 });
    if (!phone) return Response.json({ error: "phone is required for EcoCash payment" }, { status: 400 });
    if (!customer_name || !customer_name.trim()) return Response.json({ error: "Name is required" }, { status: 400 });

    const { amount, description, is_premium, is_family, max_children } = PLANS[plan];
    const reference = `${user.id.slice(0, 8)}_${Date.now()}`;
    const amountStr = amount.toFixed(2);
    const returnUrl = `https://zamaai.base44.app/payment-return?plan=${plan}&ref=${reference}`;
    const resultUrl = `https://app-api.base44.com/api/apps/69ccd46e19848b833ca275ea/prod/functions/paynowWebhook`;

    const fields = {
      id:             INTEGRATION_ID,
      reference,
      amount:         amountStr,
      additionalinfo: description,
      returnurl:      returnUrl,
      resulturl:      resultUrl,
      status:         "Message",
      authemail:      MERCHANT_EMAIL,
      method:         "ecocash",
      phone:          formatPhone(phone),
      customername:   customer_name.trim(),
    };

    const hash = await generateHash(fields);
    console.log("Hash prefix:", hash.substring(0, 6));

    const formBody = new URLSearchParams({ ...fields, hash });

    const paynowRes = await fetch(CLOUDFLARE_WORKER_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    formBody.toString(),
    });

    const text = await paynowRes.text();
    console.log("Paynow response:", text.substring(0, 300));

    const params = new URLSearchParams(text);
    const status       = (params.get("status") || "").toLowerCase();
    const pollUrl      = params.get("pollurl") || params.get("PollUrl") || "";
    const instructions = params.get("instructions") || params.get("Instructions") || "";
    const error        = params.get("error") || params.get("Error") || text;

    if (status !== "ok") {
      return Response.json({ error, rawResponse: text }, { status: 400 });
    }

    // NOTE: We intentionally do NOT create a Subscription record here.
    // The Subscription is created/activated only by paynowWebhook (or pollPaynow)
    // once Paynow confirms the payment as "paid". This prevents failed/abandoned
    // payments from being recorded as pending/paid in the database.
    return Response.json({
      mode:         "mobile",
      pollUrl,
      reference,
      plan,
      amount,
      is_premium,
      is_family:             !!is_family,
      max_children:          max_children || 1,
      teacher_referral_code: teacher_referral_code || null,
      instructions: instructions || "Check your phone and enter your EcoCash PIN to complete payment.",
    });

  } catch (err) {
    console.error("initiatePaynowPayment error:", err);
    return Response.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
});