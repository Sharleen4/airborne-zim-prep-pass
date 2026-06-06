import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const AT_USERNAME = Deno.env.get("AT_USERNAME") || "sandbox";
    const AT_API_KEY  = Deno.env.get("AT_API_KEY");

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { to, message } = await req.json();
    if (!to || !message) {
      return Response.json({ error: "to and message are required" }, { status: 400 });
    }

    // Format phone number to international format for Zimbabwe (+263)
    let phone = to.toString().replace(/\s+/g, "");
    if (phone.startsWith("0")) {
      phone = "+263" + phone.slice(1);
    } else if (phone.startsWith("263") && !phone.startsWith("+")) {
      phone = "+" + phone;
    } else if (!phone.startsWith("+")) {
      phone = "+263" + phone;
    }

    const body = new URLSearchParams({
      username: AT_USERNAME,
      to:       phone,
      message:  message,
    });

    console.log("AT_API_KEY length:", AT_API_KEY?.length, "first 6 chars:", AT_API_KEY?.substring(0, 6));
    console.log("username:", AT_USERNAME, "phone:", phone);

    const isSandbox = AT_USERNAME === "sandbox";
    const apiUrl = isSandbox
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

    const res = await fetch(apiUrl, {
      method:  "POST",
      headers: {
        "apiKey":       AT_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept":       "application/json",
      },
      body: body.toString(),
    });

    const rawText = await res.text();
    console.log("Africa's Talking raw response:", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return Response.json({ success: false, error: "Non-JSON response from Africa's Talking", raw: rawText }, { status: 200 });
    }
    console.log("Africa's Talking response:", JSON.stringify(data));

    const recipients = data?.SMSMessageData?.Recipients || [];
    const success = recipients.some(r => r.status === "Success" || r.statusCode === 101);

    return Response.json({ success, data });
  } catch (err) {
    console.error("sendAfricasTalkingSMS error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});