import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Africa's Talking Incoming SMS callback
// Set this URL in AT Dashboard: SMS -> SMS Callback URLs -> Incoming Messages
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  const bodyText = await req.text();
  const params = new URLSearchParams(bodyText);

  const date        = params.get("date") || new Date().toISOString();
  const from        = params.get("from") || "";
  const id          = params.get("id") || "";
  const linkId      = params.get("linkId") || null;
  const text        = params.get("text") || "";
  const to          = params.get("to") || "";
  const cost        = params.get("cost") || "";
  const networkCode = params.get("networkCode") || "";

  console.log("AT Incoming SMS:", { from, to, text, date, id });

  try {
    // Try to find a parent profile matching the sender's phone number
    const parents = await base44.asServiceRole.entities.ParentProfile.filter({
      parent_whatsapp_number: from,
    });

    const parent = parents[0] || null;

    // Log the incoming message
    await base44.asServiceRole.entities.NotificationLog.create({
      parent_id: parent?.id || "incoming",
      child_id: parent?.child_id || "unknown",
      parent_whatsapp_number: from,
      notification_type: "welcome", // repurposing as inbound marker
      notification_message: text,
      sent_status: "delivered",
      sent_date: date,
      whatsapp_api_response: JSON.stringify({ id, from, to, text, cost, networkCode, linkId }),
    });

    console.log("Saved incoming SMS from:", from, "| text:", text);
  } catch (err) {
    console.error("Error saving incoming SMS:", err.message);
  }

  // Must return 200 OK so AT stops retrying
  return new Response("OK", { status: 200 });
});