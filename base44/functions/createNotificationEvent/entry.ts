import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Shared utility: creates a NotificationLog record with pending status
// Payload: { parent_id, child_id, notification_type, child_name, parent_name, subject, topic, score, trial_days_remaining }
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const payload = await req.json();

  const {
    parent_id,
    child_id,
    notification_type,
    child_name,
    parent_name,
    subject,
    topic,
    score,
    trial_days_remaining,
    payment_link,
  } = payload;

  if (!parent_id || !child_id || !notification_type) {
    return Response.json({ error: 'Missing required fields: parent_id, child_id, notification_type' }, { status: 400 });
  }

  // Fetch the parent's WhatsApp number
  const parents = await base44.asServiceRole.entities.ParentProfile.filter({ id: parent_id });
  const parent = parents[0];
  if (!parent) {
    return Response.json({ error: 'ParentProfile not found', parent_id }, { status: 404 });
  }

  // Find matching active template
  const templates = await base44.asServiceRole.entities.NotificationTemplate.filter({
    template_type: notification_type,
    is_active: true,
  });
  const template = templates[0];

  // Build message content from template or use a default
  let messageContent = template?.message_content || `Notification: ${notification_type} for ${child_name || 'your child'}.`;

  // Replace placeholders
  const replacements = {
    '{{child_name}}': child_name || 'your child',
    '{{parent_name}}': parent_name || parent.parent_name || 'Parent',
    '{{subject}}': subject || '',
    '{{topic}}': topic || '',
    '{{score}}': score != null ? `${score}%` : '',
    '{{trial_days_remaining}}': trial_days_remaining != null ? `${trial_days_remaining}` : '',
    '{{payment_link}}': payment_link || 'https://zamaai.base44.app/payment',
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    messageContent = messageContent.replaceAll(placeholder, value);
  }

  // Create the NotificationLog record
  const log = await base44.asServiceRole.entities.NotificationLog.create({
    parent_id,
    child_id,
    parent_whatsapp_number: parent.parent_whatsapp_number || '',
    notification_type,
    notification_message: messageContent,
    sent_status: 'pending',
    sent_date: new Date().toISOString(),
    trial_days_remaining: trial_days_remaining ?? null,
  });

  // Send SMS via Africa's Talking if the parent has a phone number
  const phoneNumber = parent.parent_whatsapp_number;
  if (phoneNumber) {
    try {
      const AT_USERNAME = Deno.env.get("AT_USERNAME") || "sandbox";
      const AT_API_KEY  = Deno.env.get("AT_API_KEY");

      let phone = phoneNumber.toString().replace(/\s+/g, "");
      if (phone.startsWith("0")) {
        phone = "+263" + phone.slice(1);
      } else if (phone.startsWith("263") && !phone.startsWith("+")) {
        phone = "+" + phone;
      } else if (!phone.startsWith("+")) {
        phone = "+263" + phone;
      }

      const isSandbox = AT_USERNAME === "sandbox";
      const atEndpoint = isSandbox
        ? "https://api.sandbox.africastalking.com/version1/messaging"
        : "https://api.africastalking.com/version1/messaging";

      const atRes = await fetch(atEndpoint, {
        method: "POST",
        headers: {
          "apiKey":       AT_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept":       "application/json",
        },
        body: new URLSearchParams({ username: AT_USERNAME, to: phone, message: messageContent }).toString(),
      });

      const atData = await atRes.json();
      const recipients = atData?.SMSMessageData?.Recipients || [];
      const smsSent = recipients.some(r => r.status === "Success" || r.statusCode === 101);

      await base44.asServiceRole.entities.NotificationLog.update(log.id, {
        sent_status: smsSent ? 'sent' : 'failed',
        whatsapp_api_response: JSON.stringify(atData).substring(0, 500),
      });

      console.log(`SMS to ${phone}: ${smsSent ? 'sent' : 'failed'}`, atData);
    } catch (smsErr) {
      console.error("SMS send error:", smsErr.message);
      await base44.asServiceRole.entities.NotificationLog.update(log.id, { sent_status: 'failed' });
    }
  }

  return Response.json({ success: true, log_id: log.id, notification_type });
});