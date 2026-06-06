import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CLOUDFLARE_WORKER_URL = "https://zamaaiproxy.sharleenbwakura.workers.dev/poll";

const PLAN_DURATIONS = {
  "monthly":          1,
  "termly":           4,
  "annual":           12,
  "premium_monthly":  1,
  "premium_termly":   4,
  "premium_annual":   12,
  "founding_2026":    12,
  "monthly_premium":  1,
  "quarterly":        3,
  "yearly_premium":   12,
  "family_quarterly": 3,
  "family_yearly":    12,
};

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { pollUrl, reference, plan, amount, is_premium, is_family, max_children, teacher_referral_code } = body;
    if (!pollUrl) return Response.json({ error: "pollUrl is required" }, { status: 400 });
    if (!pollUrl.startsWith("https://www.paynow.co.zw/")) {
      return Response.json({ error: "Invalid poll URL" }, { status: 400 });
    }

    const res = await fetch(CLOUDFLARE_WORKER_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ pollUrl }),
    });
    const text = await res.text();
    console.log("Poll raw response:", text);

    const pollParams = new URLSearchParams(text);
    const status = (pollParams.get("status") || "").toLowerCase();
    const paid   = status === "paid";

    // Only when Paynow confirms PAID do we create/activate a Subscription.
    // This is the fallback path — the webhook is the primary source of truth.
    if (paid && reference && plan) {
      const existing = await base44.asServiceRole.entities.Subscription.filter({ paynow_reference: reference });
      if (!existing.length) {
        const today   = new Date().toISOString().split("T")[0];
        const months  = PLAN_DURATIONS[plan] ?? 3;
        const endDate = addMonths(today, months);
        await base44.asServiceRole.entities.Subscription.create({
          user_email:            user.email,
          plan,
          status:                "active",
          start_date:            today,
          end_date:              endDate,
          paynow_reference:      reference,
          amount_paid:           amount,
          is_premium:            !!is_premium,
          is_family:             !!is_family,
          max_children:          max_children || 1,
          teacher_referral_code: teacher_referral_code || null,
        });
        console.log(`Subscription activated via poll: ${user.email} / ${plan}`);
      } else if (existing[0].status !== "active") {
        const today   = new Date().toISOString().split("T")[0];
        const months  = PLAN_DURATIONS[existing[0].plan] ?? 3;
        const endDate = addMonths(today, months);
        await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
          status:     "active",
          start_date: today,
          end_date:   endDate,
        });
      }
    }

    return Response.json({ status, paid });
  } catch (err) {
    console.error("pollPaynow error:", err);
    return Response.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
});