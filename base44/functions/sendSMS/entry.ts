import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// For sandbox testing, username MUST be "sandbox" and use the sandbox endpoint.
// Set AFRICASTALKING_USERNAME to "sandbox" for testing, or your real app name for production.
const AT_USERNAME = "sandbox";
const AT_API_KEY  = Deno.env.get("AFRICASTALKING_API_KEY");
const AT_ENDPOINT = "https://api.sandbox.africastalking.com/version1/messaging";

function normalizePhone(phone) {
  let p = String(phone).replace(/\s+/g, "");
  if (p.startsWith("0")) return "+263" + p.slice(1);
  if (p.startsWith("263") && !p.startsWith("+")) return "+" + p;
  if (!p.startsWith("+")) return "+263" + p;
  return p;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, recipients: [], messageId: null, error: "Unauthorized" }, { status: 401 });

    const { to, message } = await req.json();

    if (!to || !message) {
      return Response.json({ success: false, recipients: [], messageId: null, error: "to and message are required" }, { status: 400 });
    }

    if (!AT_USERNAME || !AT_API_KEY) {
      return Response.json({ success: false, recipients: [], messageId: null, error: "Africa's Talking credentials not configured" }, { status: 500 });
    }

    const recipients = (Array.isArray(to) ? to : [to]).map(normalizePhone);
    console.log("Sending SMS to:", recipients, "via username:", AT_USERNAME);

    const res = await fetch(AT_ENDPOINT, {
      method: "POST",
      headers: {
        "apiKey": AT_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({ username: AT_USERNAME, to: recipients.join(","), message }).toString(),
    });

    const rawText = await res.text();
    console.log("Africa's Talking response:", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return Response.json({ success: false, recipients: [], messageId: null, error: rawText }, { status: 200 });
    }

    const smsData = data?.SMSMessageData || {};
    const apiRecipients = smsData?.Recipients || [];
    const messageId = smsData?.MessageId || null;
    const success = apiRecipients.length > 0 && apiRecipients.some(r => r.status === "Success" || r.statusCode === 101);

    console.log("SMS result — success:", success, "recipients:", JSON.stringify(apiRecipients));

    return Response.json({
      success,
      recipients: apiRecipients,
      messageId,
      error: success ? null : (data?.errorMessage || "Delivery failed for one or more recipients"),
    });

  } catch (err) {
    console.error("sendSMS error:", err.message);
    return Response.json({ success: false, recipients: [], messageId: null, error: err.message }, { status: 500 });
  }
});