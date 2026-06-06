import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const AT_USERNAME = Deno.env.get("AFRICASTALKING_USERNAME") || "sandbox";
const AT_API_KEY  = Deno.env.get("AFRICASTALKING_API_KEY");
const BATCH_SIZE  = 100;
const AT_ENDPOINT = AT_USERNAME === "sandbox"
  ? "https://api.sandbox.africastalking.com/version1/messaging"
  : "https://api.africastalking.com/version1/messaging";

function normalizePhone(phone) {
  let p = String(phone).replace(/\s+/g, "");
  if (p.startsWith("0")) return "+263" + p.slice(1);
  if (p.startsWith("263") && !p.startsWith("+")) return "+" + p;
  if (!p.startsWith("+")) return "+263" + p;
  return p;
}

function applyVariables(template, variables = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`
  );
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function sendBatch(phones, message) {
  const res = await fetch(AT_ENDPOINT, {
    method: "POST",
    headers: {
      "apiKey": AT_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: new URLSearchParams({
      username: AT_USERNAME,
      to: phones.join(","),
      message,
    }).toString(),
  });

  const rawText = await res.text();
  console.log("Batch response:", rawText);

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    return { error: rawText, recipients: [] };
  }

  return {
    error: null,
    recipients: data?.SMSMessageData?.Recipients || [],
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { recipients, message, variables } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return Response.json({ error: "recipients must be a non-empty array" }, { status: 400 });
    }
    if (!message) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }
    if (!AT_USERNAME || !AT_API_KEY) {
      return Response.json({ error: "Africa's Talking credentials not configured" }, { status: 500 });
    }

    const resolvedMessage = applyVariables(message, variables || {});
    const normalizedPhones = recipients.map(normalizePhone);
    const batches = chunkArray(normalizedPhones, BATCH_SIZE);

    console.log(`Sending bulk SMS: ${normalizedPhones.length} recipients, ${batches.length} batch(es)`);

    const allResults = [];
    let sent = 0;
    let failed = 0;

    for (const batch of batches) {
      const { recipients: batchResults, error } = await sendBatch(batch, resolvedMessage);

      if (error) {
        // Whole batch failed
        failed += batch.length;
        batch.forEach(phone => allResults.push({ number: phone, status: "Failed", error }));
      } else {
        batchResults.forEach(r => {
          const success = r.status === "Success" || r.statusCode === 101;
          if (success) sent++;
          else failed++;
          allResults.push({
            number: r.number,
            status: r.status,
            statusCode: r.statusCode,
            messageId: r.messageId || null,
            cost: r.cost || null,
          });
        });
      }
    }

    console.log(`Bulk SMS done — sent: ${sent}, failed: ${failed}`);

    return Response.json({
      total: normalizedPhones.length,
      sent,
      failed,
      results: allResults,
    });

  } catch (err) {
    console.error("sendBulkSMS error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});