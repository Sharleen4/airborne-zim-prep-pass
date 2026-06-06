import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FOUNDING_PLAN = "founding_2026";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduled calls (no user auth required for automation)
  const user = await base44.auth.me().catch(() => null);
  if (user && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results = { activated: [], founding_slots_added: 0, errors: [] };

  // 1. Find all pending subscriptions
  const pending = await base44.asServiceRole.entities.Subscription.filter({ status: 'pending' });

  for (const sub of pending) {
    // Check if there's a paynow reference to poll
    if (!sub.paynow_reference && !sub.poll_url) continue;

    // Try to poll the payment status via Paynow (if poll_url stored)
    // Since we store the reference, mark as active if the reference exists and amount_paid > 0
    // (Payment was already confirmed at initiation time — pending just means not yet activated)
    if (sub.amount_paid && sub.amount_paid > 0) {
      try {
        // Activate the subscription
        const startDate = new Date().toISOString().split('T')[0];
        let endDate;

        if (sub.plan === FOUNDING_PLAN) {
          endDate = '2026-12-31';
        } else if (sub.plan === 'monthly' || sub.plan === 'premium_monthly') {
          const d = new Date(); d.setMonth(d.getMonth() + 1);
          endDate = d.toISOString().split('T')[0];
        } else if (sub.plan === 'termly' || sub.plan === 'premium_termly') {
          const d = new Date(); d.setMonth(d.getMonth() + 4);
          endDate = d.toISOString().split('T')[0];
        } else if (sub.plan === 'annual' || sub.plan === 'premium_annual') {
          const d = new Date(); d.setFullYear(d.getFullYear() + 1);
          endDate = d.toISOString().split('T')[0];
        } else {
          const d = new Date(); d.setFullYear(d.getFullYear() + 1);
          endDate = d.toISOString().split('T')[0];
        }

        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          status: 'active',
          start_date: startDate,
          end_date: endDate,
        });

        results.activated.push({ email: sub.user_email, plan: sub.plan, id: sub.id });

        // 2. If founding plan, increment slots_used
        if (sub.plan === FOUNDING_PLAN) {
          const offers = await base44.asServiceRole.entities.FoundingOffer.filter({ is_active: true });
          if (offers.length > 0) {
            const offer = offers[0];
            await base44.asServiceRole.entities.FoundingOffer.update(offer.id, {
              slots_used: (offer.slots_used || 0) + 1,
            });
            results.founding_slots_added++;
          }
        }
      } catch (e) {
        results.errors.push({ id: sub.id, email: sub.user_email, error: e.message });
      }
    }
  }

  // 3. Also check active subscriptions that have passed end_date and expire them
  const active = await base44.asServiceRole.entities.Subscription.filter({ status: 'active' });
  const today = new Date().toISOString().split('T')[0];
  let expired = 0;

  for (const sub of active) {
    if (sub.end_date && sub.end_date < today) {
      await base44.asServiceRole.entities.Subscription.update(sub.id, { status: 'expired' });
      expired++;
    }
  }

  return Response.json({
    success: true,
    activated: results.activated.length,
    founding_slots_added: results.founding_slots_added,
    expired,
    errors: results.errors,
    details: results.activated,
    timestamp: new Date().toISOString(),
  });
});