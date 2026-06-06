import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Triggered by entity automation on HomeworkAssignment (update)
// Only fires when status changes to "completed"
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const hw = body.data;
  const oldHw = body.old_data;

  // Only act if status just changed to "completed"
  if (!hw || hw.status !== 'completed' || oldHw?.status === 'completed') {
    return Response.json({ skipped: true });
  }

  const studentEmail = hw.student_email || hw.parent_email;

  await base44.asServiceRole.functions.invoke('updateChildPerformance', {
    event_type: 'homework_completed',
    student_email: studentEmail,
  });

  // --- SMS Notification to parent ---
  const childProfiles = await base44.asServiceRole.entities.ChildProfile.filter({ parent_email: studentEmail });
  const childProfile = childProfiles[0] || null;

  if (childProfile) {
    const parentProfiles = await base44.asServiceRole.entities.ParentProfile.filter({ user_email: childProfile.parent_email });
    const parent = parentProfiles[0] || null;

    if (parent) {
      await base44.asServiceRole.functions.invoke('createNotificationEvent', {
        parent_id: parent.id,
        child_id: childProfile.id,
        notification_type: 'homework_completed',
        child_name: childProfile.child_name,
        parent_name: parent.parent_name,
        subject: hw.title || '',
      });
      console.log(`Homework completed SMS sent for ${childProfile.child_name}`);
    }
  }

  return Response.json({ success: true });
});