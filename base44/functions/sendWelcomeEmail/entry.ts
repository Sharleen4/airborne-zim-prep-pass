import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Triggered by entity automation when a new User is created
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct call and entity automation payload
    const user = body.data || body;
    const email = user.email;
    const name = user.full_name || email?.split("@")[0] || "there";

    if (!email) {
      return Response.json({ error: "No email found in payload" }, { status: 400 });
    }

    const result = await base44.asServiceRole.functions.invoke('sendEngagementEmail', {
      email_type: 'welcome',
      recipient_email: email,
      parent_name: name,
      child_name: name,
    });

    return Response.json({ success: true, email, result });
  } catch (err) {
    console.error("sendWelcomeEmail error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});