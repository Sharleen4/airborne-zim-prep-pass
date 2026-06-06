import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scheduled weekly job — sends weekly summary emails to all active parents
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const parents = await base44.asServiceRole.entities.ParentProfile.list();
  const results = [];

  for (const parent of parents) {
    if (!parent.user_email) continue;

    // Find child profile
    const children = await base44.asServiceRole.entities.ChildProfile.filter({ parent_email: parent.user_email });
    const child = children[0];
    if (!child) continue;

    // Get metrics
    const metricsList = await base44.asServiceRole.entities.ChildPerformanceMetrics.filter({ child_id: child.id });
    const metrics = metricsList[0];

    // Only send if child has been somewhat active (at least 1 quiz this week)
    if (!metrics || metrics.quizzes_completed === 0) continue;

    await base44.asServiceRole.functions.invoke('sendEngagementEmail', {
      email_type: 'weekly_summary',
      recipient_email: parent.user_email,
      parent_name: parent.parent_name || 'Parent',
      child_name: child.child_name || 'your child',
    });

    results.push({ email: parent.user_email, child: child.child_name });
    console.log(`Weekly summary sent to ${parent.user_email}`);
  }

  return Response.json({ success: true, sent: results.length, results });
});