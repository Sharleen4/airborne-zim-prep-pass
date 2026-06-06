import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { recipients } = await req.json();
    const list = recipients && recipients.length
      ? recipients
      : ["sharleenbwakura@gmail.com", "machipisamoses1@gmail.com"];

    const today = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const reference = `TEST_${Date.now()}`;

    const emailBody = `Hi there,

Thank you for subscribing to Zamaai! Your payment has been received and your account is now active.

━━━━━━━━━━━━━━━━━━━━━━━━━
PAYMENT RECEIPT (TEST)
━━━━━━━━━━━━━━━━━━━━━━━━━
Plan:        Standard Annual Plan
Amount Paid: USD $30.00
Reference:   ${reference}
Start Date:  ${today}
End Date:    ${endDate}
━━━━━━━━━━━━━━━━━━━━━━━━━

Your child can now access all study materials, practice questions, and mock exams on Zamaai.

Log in at: https://zamaaiprimary.online

If you have any questions, reply to this email or contact us at admin@zamaaiprimary.online.

The Zamaai Team`;

    const results = [];
    for (const to of list) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to,
          subject: "✅ [TEST] Your Zamaai Subscription is Active – Payment Receipt",
          body: emailBody,
          from_name: "Zamaai",
        });
        results.push({ to, status: "sent" });
      } catch (e) {
        results.push({ to, status: "failed", error: e.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});