import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const INTEGRATION_KEY = Deno.env.get("PAYNOW_INTEGRATION_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
const TEACHER_EARNING_PER_SUBSCRIPTION = 2;

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

const PLAN_DURATIONS = {
  "monthly":         1,
  "termly":          4,
  "annual":          12,
  "premium_monthly": 1,
  "premium_termly":  4,
  "premium_annual":  12,
  "founding_2026":   12,
};

async function generateHash(values) {
  const str = Object.values(values)
    .filter(v => v !== "" && v !== null && v !== undefined)
    .join("") + INTEGRATION_KEY;
  const encoded = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-512", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const text = await req.text();
  const params = new URLSearchParams(text);

  const receivedHash = (params.get("hash") || "").toUpperCase();
  const status       = (params.get("status") || "").toLowerCase();
  const reference    = params.get("reference") || "";

  console.log("Webhook received — status:", status, "reference:", reference);

  // Build verify object from all params except hash
  const verifyValues = {};
  for (const [key, value] of params.entries()) {
    if (key.toLowerCase() !== "hash") verifyValues[key] = value;
  }

  const expectedHash = await generateHash(verifyValues);
  console.log("Expected hash prefix:", expectedHash.substring(0, 8));
  console.log("Received hash prefix:", receivedHash.substring(0, 8));

  if (expectedHash !== receivedHash) {
    console.error("Hash mismatch — rejecting webhook");
    return new Response("Invalid hash", { status: 400 });
  }

  if (status === "cancelled" || status === "failed") {
    const subs = await base44.asServiceRole.entities.Subscription.filter({ paynow_reference: reference });
    if (subs.length) {
      await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: "expired" });
    }
    return new Response("OK");
  }

  if (status !== "paid") {
    console.log("Non-paid status:", status);
    return new Response("OK");
  }

  // Find existing subscription for this reference (any status).
  // Subscriptions are no longer pre-created on initiation — they are created here on PAID.
  const allSubs = await base44.asServiceRole.entities.Subscription.filter({
    paynow_reference: reference,
  });

  let sub = allSubs[0];

  // If the subscription is already active, this is a duplicate webhook — acknowledge and stop.
  if (sub && sub.status === "active") {
    console.log("Subscription already active for reference:", reference);
    return new Response("OK");
  }

  const today   = new Date().toISOString().split("T")[0];
  const months  = PLAN_DURATIONS[sub?.plan] ?? 3;
  const endDate = addMonths(today, months);

  if (sub) {
    await base44.asServiceRole.entities.Subscription.update(sub.id, {
      status:           "active",
      start_date:       today,
      end_date:         endDate,
      paynow_reference: params.get("paynowreference") || reference,
    });
  } else {
    // No record exists yet — webhook is the first confirmation. We don't have full plan
    // metadata here, so we record minimum info; pollPaynow / frontend fallback will fill the rest.
    console.warn("No subscription record found for reference, skipping webhook activation (will be handled by pollPaynow):", reference);
    return new Response("OK");
  }

  console.log(`Subscription activated: user=${sub.user_email}, plan=${sub.plan}, end=${endDate}`);

  // ── Founding Student Offer Tracking ──────────────────────────────────────
  if (sub.plan === "founding_2026") {
    try {
      const offers = await base44.asServiceRole.entities.FoundingOffer.list();
      if (offers.length > 0) {
        const offer = offers[0];
        await base44.asServiceRole.entities.FoundingOffer.update(offer.id, {
          slots_used: (offer.slots_used || 0) + 1,
        });
      }
      // Notify admin
      if (ADMIN_EMAIL) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to:        ADMIN_EMAIL,
          subject:   "🎓 New Founding Student! Slot taken on Zamaai",
          body:      `A new founding student just paid!\n\nEmail: ${sub.user_email}\nAmount: $${sub.amount_paid}\nReference: ${reference}\nDate: ${today}\n\nLog in to view the admin panel: https://zamaaiprimary.online/admin`,
          from_name: "Zamaai",
        });
      }
    } catch (err) {
      console.error("Failed to update founding offer count:", err.message);
    }
  }

  // ── Teacher Referral Earning ──────────────────────────────────────────
  if (sub.teacher_referral_code) {
    try {
      // Find the teacher with this referral code (direct filter — reliable & fast)
      const matches = await base44.asServiceRole.entities.User.filter({ referral_code: sub.teacher_referral_code });
      const teacher = matches[0];
      if (teacher) {
        await base44.asServiceRole.entities.TeacherEarning.create({
          teacher_email:          teacher.email,
          teacher_referral_code:  sub.teacher_referral_code,
          referred_user_email:    sub.user_email,
          subscription_id:        sub.id,
          amount_earned:          TEACHER_EARNING_PER_SUBSCRIPTION,
          payout_status:          "pending",
        });
        console.log(`Teacher earning recorded: teacher=${teacher.email}, amount=$${TEACHER_EARNING_PER_SUBSCRIPTION}`);

        // Notify teacher by email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to:        teacher.email,
          subject:   "🎉 You earned $2 — New referral subscription on Zama Ai Primary!",
          body:      `Hi ${teacher.full_name || "Teacher"},\n\nGreat news! A user subscribed using your referral link.\n\nYou have earned $${TEACHER_EARNING_PER_SUBSCRIPTION} USD for this referral.\n\nLog in to view your earnings dashboard:\nhttps://zamaaiprimary.online/teacher-dashboard\n\nThank you for being a Zama Ai Primary partner!\n\nThe Zamaai Team`,
          from_name: "Zamaai",
        });
      }
    } catch (err) {
      console.error("Failed to record teacher earning:", err.message);
    }
  }

  // Update ParentProfile — clear trial, mark as paid/active
  const parentProfiles = await base44.asServiceRole.entities.ParentProfile.filter({ user_email: sub.user_email });
  for (const profile of parentProfiles) {
    await base44.asServiceRole.entities.ParentProfile.update(profile.id, {
      subscription_status:  "active",
      payment_status:       "paid",
      free_trial_end_date:  null,
    });
  }

  // Send payment confirmation notification
  if (parentProfiles.length > 0) {
    const parent   = parentProfiles[0];
    const children = await base44.asServiceRole.entities.ChildProfile.filter({ parent_email: sub.user_email });
    if (children.length > 0) {
      await base44.asServiceRole.functions.invoke("createNotificationEvent", {
        parent_id:         parent.id,
        child_id:          children[0].id,
        notification_type: "payment_confirmation",
        parent_name:       parent.parent_name,
        child_name:        children[0].child_name,
      });
    }
  }

  // Send email receipt
  try {
    const PLAN_LABELS = {
      "monthly":         "Standard Monthly Plan",
      "termly":          "Standard Termly (4-Month) Plan",
      "annual":          "Standard Annual Plan",
      "premium_monthly": "Premium Monthly Plan",
      "premium_termly":  "Premium Termly (4-Month) Plan",
      "premium_annual":  "Premium Annual Plan",
    };
    const planLabel  = PLAN_LABELS[sub.plan] || sub.plan;
    const parentName = parentProfiles.length > 0 ? parentProfiles[0].parent_name : "Valued Customer";

    const emailBody = `Hi ${parentName},

Thank you for subscribing to Zamaai! Your payment has been received and your account is now active.

━━━━━━━━━━━━━━━━━━━━━━━━━
PAYMENT RECEIPT
━━━━━━━━━━━━━━━━━━━━━━━━━
Plan:        ${planLabel}
Amount Paid: USD $${sub.amount_paid.toFixed(2)}
Reference:   ${reference}
Start Date:  ${today}
End Date:    ${endDate}
━━━━━━━━━━━━━━━━━━━━━━━━━

Your child can now access all study materials, practice questions, and mock exams on Zamaai.

Log in at: https://zamaaiprimary.online

If you have any questions, reply to this email or contact us at admin@zamaaiprimary.online.

The Zamaai Team`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to:        sub.user_email,
      subject:   "✅ Your Zamaai Subscription is Active – Payment Receipt",
      body:      emailBody,
      from_name: "Zamaai",
    });

    console.log("Receipt email sent to:", sub.user_email);
  } catch (emailErr) {
    console.error("Failed to send receipt email:", emailErr.message);
  }

  return new Response("OK");
});