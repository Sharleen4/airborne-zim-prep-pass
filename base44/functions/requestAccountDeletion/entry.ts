import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Lets a logged-in user request account deletion from inside the app.
// - Marks the user record with deletion metadata
// - Emails support@ and the user with a confirmation receipt
// Admins then permanently purge the account within the documented window.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = (body.reason || "").toString().slice(0, 500);

    const now = new Date().toISOString();
    const supportEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "support@zamaaiprimary.online";

    // Mark the user's record so admins can find pending deletions quickly.
    try {
      await base44.auth.updateMe({
        account_deletion_requested: true,
        account_deletion_requested_at: now,
        account_deletion_reason: reason || undefined,
      });
    } catch (e) {
      console.warn("updateMe failed (non-fatal):", e?.message);
    }

    // Notify support / admin
    try {
      await base44.integrations.Core.SendEmail({
        to: supportEmail,
        subject: `Account deletion request — ${user.email}`,
        body:
`A user has requested account deletion from inside the app.

Name:    ${user.full_name || "(no name)"}
Email:   ${user.email}
Role:    ${user.role || "user"}
Time:    ${now}

Reason given by user:
${reason || "(none provided)"}

Please action this within 7 business days per our published Delete Account policy.`,
      });
    } catch (e) {
      console.warn("SendEmail to support failed:", e?.message);
    }

    // Send the user a confirmation receipt
    try {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: "We've received your account deletion request",
        body:
`Hi ${user.full_name?.split(" ")[0] || "there"},

We've received your request to delete your Zama Ai Primary account.

What happens next:
1. Our team will action your request within 7 business days.
2. Your account, child profiles, progress and personal data will be permanently removed.
3. Billing records are kept for 5 years as required by Zimbabwean law (see our Privacy Policy).

If you didn't make this request, or you've changed your mind, reply to this email immediately and we'll cancel it.

Thank you for using Zama Ai Primary.

— The Zama Ai Primary team`,
      });
    } catch (e) {
      console.warn("SendEmail to user failed:", e?.message);
    }

    return Response.json({ success: true, requested_at: now });
  } catch (error) {
    console.error("requestAccountDeletion error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});