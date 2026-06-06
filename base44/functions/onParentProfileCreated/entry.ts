import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Triggered by entity automation on ParentProfile (create)
// EVENT: welcome_signup
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();
  const parent = body.data;

  if (!parent?.id) return Response.json({ skipped: true });

  // Find linked child
  const children = await base44.asServiceRole.entities.ChildProfile.filter({ parent_email: parent.user_email });
  const child = children[0];

  await base44.asServiceRole.functions.invoke('createNotificationEvent', {
    parent_id: parent.id,
    child_id: child?.id || parent.child_id || 'unknown',
    notification_type: 'welcome',
    parent_name: parent.parent_name,
    child_name: child?.child_name || '',
  });

  return Response.json({ success: true });
});