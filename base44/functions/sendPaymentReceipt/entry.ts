import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLAN_LABELS = {
  "3_month":         "Standard 3-Month Plan",
  "annual":          "Standard Annual Plan",
  "premium_3_month": "Premium 3-Month Plan",
  "premium_annual":  "Premium Annual Plan",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Find the most recent active or pending subscription for this user
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_email: user.email });
    if (!subs.length) return Response.json({ error: "No subscription found" }, { status: 404 });

    // Sort by created_date desc and pick the latest
    subs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    const sub = subs[0];

    const planLabel = PLAN_LABELS[sub.plan] || sub.plan;
    const amount = sub.amount_paid ? `$${Number(sub.amount_paid).toFixed(2)}` : "N/A";
    const endDate = sub.end_date || "N/A";
    const startDate = sub.start_date || new Date().toISOString().split("T")[0];
    const reference = sub.paynow_reference || "N/A";

    const emailBody = `Hi ${user.full_name || "there"},

Your payment has been received and your Zamaai subscription is now active.

PAYMENT RECEIPT
---------------
Plan:        ${planLabel}
Amount Paid: USD ${amount}
Reference:   ${reference}
Start Date:  ${startDate}
End Date:    ${endDate}
---------------

Your child now has full access to all study materials, practice questions, and mock exams on Zamaai.

Login at: https://zamaaiprimary.online

Questions? Contact us at admin@zamaaiprimary.online

The Zamaai Team`;

    await base44.integrations.Core.SendEmail({
      to:        user.email,
      subject:   "Payment Receipt – Zamaai Subscription Confirmed",
      body:      emailBody,
      from_name: "Zamaai",
    });

    console.log("Receipt email sent to:", user.email);
    return Response.json({ success: true });
  } catch (err) {
    console.error("sendPaymentReceipt error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});