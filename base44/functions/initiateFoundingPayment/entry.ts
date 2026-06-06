import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const INTEGRATION_ID  = Deno.env.get("PAYNOW_INTEGRATION_ID");
const INTEGRATION_KEY = Deno.env.get("PAYNOW_INTEGRATION_KEY");
const MERCHANT_EMAIL  = Deno.env.get("PAYNOW_MERCHANT_EMAIL");
const ADMIN_EMAIL     = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");

const CLOUDFLARE_WORKER_URL = "https://zamaaiproxy.sharleenbwakura.workers.dev/initiate";
const FOUNDING_PRICE = 7.00;

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

    const { phone, customer_name, teacher_referral_code } = await req.json();
    if (!phone) return Response.json({ error: "phone is required" }, { status: 400 });
    if (!customer_name || !customer_name.trim()) return Response.json({ error: "Name is required" }, { status: 400 });

    // Grade 7 only restriction
    if (user.grade && user.grade !== "Grade 7") {
      return Response.json({ error: "The founding offer is currently available for Grade 7 students only." }, { status: 403 });
    }

    // Check if offer is active and has slots
    const offers = await base44.asServiceRole.entities.FoundingOffer.list();
    const offer = offers[0];
    if (!offer) return Response.json({ error: "Founding offer not found" }, { status: 404 });
    if (!offer.is_active) return Response.json({ error: "Founding offer is no longer active" }, { status: 400 });
    if (offer.slots_used >= offer.total_slots) {
      return Response.json({ error: "All founding student slots have been filled" }, { status: 400 });
    }

    // Check if this user already has a founding subscription
    const existing = await base44.asServiceRole.entities.Subscription.filter({ user_email: user.email, plan: "founding_2026" });
    if (existing.some(s => s.status === "active")) {
      return Response.json({ error: "You already have a founding student subscription" }, { status: 400 });
    }

    const reference = `founding_${user.id.slice(0, 8)}_${Date.now()}`;
    const amountStr = FOUNDING_PRICE.toFixed(2);
    const returnUrl = `https://zamaai.base44.app/payment-return?plan=founding_2026&ref=${reference}`;
    const resultUrl = `https://app-api.base44.com/api/apps/69ccd46e19848b833ca275ea/prod/functions/paynowWebhook`;

    const fields = {
      id:             INTEGRATION_ID,
      reference,
      amount:         amountStr,
      additionalinfo: "Zamaai 2026 Founding Student — Full Year Access",
      returnurl:      returnUrl,
      resulturl:      resultUrl,
      status:         "Message",
      authemail:      MERCHANT_EMAIL,
      method:         "ecocash",
      phone:          formatPhone(phone),
      customername:   customer_name.trim(),
    };

    const hash = await generateHash(fields);
    const formBody = new URLSearchParams({ ...fields, hash });

    const paynowRes = await fetch(CLOUDFLARE_WORKER_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    formBody.toString(),
    });

    const text = await paynowRes.text();
    const params = new URLSearchParams(text);
    const status       = (params.get("status") || "").toLowerCase();
    const pollUrl      = params.get("pollurl") || params.get("PollUrl") || "";
    const instructions = params.get("instructions") || params.get("Instructions") || "";
    const error        = params.get("error") || params.get("Error") || text;

    if (status !== "ok") {
      return Response.json({ error, rawResponse: text }, { status: 400 });
    }

    // NOTE: Subscription is NOT created here. It will be created by paynowWebhook
    // (or pollPaynow as a fallback) only after Paynow confirms payment as "paid".
    return Response.json({
      mode:         "mobile",
      pollUrl,
      reference,
      plan:                  "founding_2026",
      amount:                FOUNDING_PRICE,
      is_premium:            false,
      teacher_referral_code: teacher_referral_code || null,
      instructions: instructions || "Check your phone and enter your EcoCash PIN to complete payment.",
    });

  } catch (err) {
    console.error("initiateFoundingPayment error:", err);
    return Response.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
});