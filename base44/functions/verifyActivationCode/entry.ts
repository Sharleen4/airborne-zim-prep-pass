import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLAN_META = {
  monthly: { is_premium: true, is_family: false, max_children: 1 },
  quarterly: { is_premium: true, is_family: false, max_children: 1 },
  yearly_premium: { is_premium: true, is_family: false, max_children: 1 },
  monthly_premium: { is_premium: true, is_family: false, max_children: 1 },
  family_quarterly: { is_premium: true, is_family: true, max_children: 4 },
  family_yearly: { is_premium: true, is_family: true, max_children: 4 },
  founding_2026: { is_premium: true, is_family: false, max_children: 1 },
  premium: { is_premium: true, is_family: false, max_children: 1 },
};

function normalizeCode(value) {
  return String(value || "").trim().replace(/\s+/g, "").toUpperCase();
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("263")) return digits;
  if (digits.startsWith("0")) return `263${digits.slice(1)}`;
  return `263${digits}`;
}

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

function nowIso() {
  return new Date().toISOString();
}

function isExpired(expiryDate) {
  if (!expiryDate) return true;
  return String(expiryDate) < todayDate();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const code = normalizeCode(body.activation_code || body.code);
    const phone = normalizePhone(body.phone || body.phone_number);
    const deviceId = String(body.device_id || "").trim();

    if (!phone) return Response.json({ error: "Phone number is required" }, { status: 400 });
    if (!code) return Response.json({ error: "Activation code is required" }, { status: 400 });
    if (!deviceId) return Response.json({ error: "Device id is required" }, { status: 400 });

    const matches = await base44.asServiceRole.entities.ActivationCode.filter({ code });
    const activation = matches[0];
    if (!activation) return Response.json({ error: "Activation code was not found" }, { status: 404 });

    if (activation.status === "revoked") {
      return Response.json({ error: "This activation code has been revoked" }, { status: 403 });
    }

    if (isExpired(activation.expiry_date)) {
      await base44.asServiceRole.entities.ActivationCode.update(activation.id, { status: "expired" });
      return Response.json({ error: "This activation code has expired", active: false, isExpired: true }, { status: 403 });
    }

    const existingPhone = normalizePhone(activation.phone_number);
    if (existingPhone && existingPhone !== phone) {
      return Response.json({ error: "This code is linked to a different phone number" }, { status: 403 });
    }

    const deviceBinding = activation.device_binding !== false;
    if (deviceBinding && activation.bound_device_id && activation.bound_device_id !== deviceId) {
      return Response.json({ error: "This code is already linked to another device" }, { status: 403 });
    }

    const activatedByOtherUser =
      activation.activated_user_email &&
      activation.activated_user_email !== user.email &&
      (activation.activation_count || 0) >= (activation.max_activations || 1);
    if (activatedByOtherUser) {
      return Response.json({ error: "This code has already been used" }, { status: 403 });
    }

    const plan = activation.plan || "monthly_premium";
    const meta = PLAN_META[plan] || PLAN_META.monthly_premium;
    const maxChildren = activation.child_limit || meta.max_children || 1;
    const now = nowIso();
    const firstActivation = !activation.activated_at;

    await base44.asServiceRole.entities.ActivationCode.update(activation.id, {
      status: "active",
      phone_number: activation.phone_number || phone,
      bound_device_id: deviceBinding ? (activation.bound_device_id || deviceId) : activation.bound_device_id,
      activated_user_email: activation.activated_user_email || user.email,
      activated_at: activation.activated_at || now,
      last_verified_at: now,
      activation_count: firstActivation ? (activation.activation_count || 0) + 1 : (activation.activation_count || 1),
    });

    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: user.email,
      paynow_reference: `activation:${code}`,
    });

    const subscriptionPayload = {
      user_email: user.email,
      plan,
      status: "active",
      start_date: todayDate(),
      end_date: activation.expiry_date,
      paynow_reference: `activation:${code}`,
      amount_paid: 0,
      is_premium: !!meta.is_premium,
      is_family: !!meta.is_family || maxChildren > 1,
      max_children: maxChildren,
      description: `Activation code ${code} for ${phone}`,
    };

    if (existingSubs[0]) {
      await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, subscriptionPayload);
    } else {
      await base44.asServiceRole.entities.Subscription.create(subscriptionPayload);
    }

    const parentProfiles = await base44.asServiceRole.entities.ParentProfile.filter({ user_email: user.email });
    for (const profile of parentProfiles) {
      await base44.asServiceRole.entities.ParentProfile.update(profile.id, {
        parent_whatsapp_number: profile.parent_whatsapp_number || phone,
        subscription_status: "active",
        payment_status: "paid",
        free_trial_end_date: null,
      });
    }

    return Response.json({
      active: true,
      status: "active",
      activation_status: "active",
      phone,
      device_id: deviceId,
      plan,
      end_date: activation.expiry_date,
      expiry_date: activation.expiry_date,
      isPremium: !!meta.is_premium,
      isFamily: !!meta.is_family || maxChildren > 1,
      maxChildren,
      max_children: maxChildren,
      child_limit: maxChildren,
      device_bound: deviceBinding,
      last_verified_at: now,
    });
  } catch (err) {
    console.error("verifyActivationCode error:", err);
    return Response.json({ error: err.message || "Could not verify activation code" }, { status: 500 });
  }
});
