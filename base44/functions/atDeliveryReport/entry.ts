import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Africa's Talking Delivery Report callback
// Set this URL in AT Dashboard: SMS -> SMS Callback URLs -> Delivery Reports
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  const bodyText = await req.text();
  const params = new URLSearchParams(bodyText);

  const id          = params.get("id") || "";
  const status      = params.get("status") || "";
  const phoneNumber = params.get("phoneNumber") || "";
  const networkCode = params.get("networkCode") || "";
  const failureReason = params.get("failureReason") || null;
  const retryCount  = params.get("retryCount") || null;

  console.log("AT Delivery Report:", { id, status, phoneNumber, networkCode, failureReason });

  // Update matching NotificationLog record if we can find one by message ID
  // The id here matches the messageId returned when we sent the SMS
  try {
    const logs = await base44.asServiceRole.entities.NotificationLog.filter({
      whatsapp_api_response: id,
    });

    const deliveryStatus = status === "Success" ? "delivered" : (status === "Failed" || status === "Rejected" || status === "Expired") ? "failed" : "sent";

    if (logs.length > 0) {
      await base44.asServiceRole.entities.NotificationLog.update(logs[0].id, {
        sent_status: deliveryStatus,
        whatsapp_api_response: JSON.stringify({ messageId: id, status, networkCode, failureReason, retryCount }),
      });
      console.log("Updated NotificationLog:", logs[0].id, "->", deliveryStatus);
    } else {
      // Store as a generic log entry even if we can't match an existing record
      console.log("No matching NotificationLog found for messageId:", id);
    }
  } catch (err) {
    console.error("Error updating NotificationLog:", err.message);
  }

  // Must return 200 OK so AT stops retrying
  return new Response("OK", { status: 200 });
});