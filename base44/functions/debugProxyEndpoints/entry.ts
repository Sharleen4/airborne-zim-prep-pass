// Test what the proxy accepts and returns for different payloads
const PROXY_BASE = "https://zamaaiproxy.sharleenbwakura.workers.dev";
const ID  = Deno.env.get("PAYNOW_INTEGRATION_ID");
const KEY = Deno.env.get("PAYNOW_INTEGRATION_KEY");
const KEY_USD = Deno.env.get("PAYNOW_INTEGRATION_KEY_USD");
const EMAIL = Deno.env.get("PAYNOW_MERCHANT_EMAIL");

Deno.serve(async (req) => {
  const reference  = "TEST-PROBE-001";
  const amount     = "4.00";
  const returnUrl  = "https://zamaai.base44.app/payment-return";
  const resultUrl  = "https://app-api.base44.com/api/apps/69ccd46e19848b833ca275ea/prod/functions/paynowWebhook";
  const phone      = "2630771234567";

  // Option 1: send WITHOUT a hash — maybe proxy generates it
  const noHashPayload = new URLSearchParams({
    id: ID, reference, amount,
    additionalinfo: "Test",
    returnurl: returnUrl,
    resulturl: resultUrl,
    authemail: EMAIL,
    status: "Message",
    phone,
    method: "ecocash",
  });

  const r1 = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: noHashPayload.toString(),
  });
  const t1 = await r1.text();

  // Option 2: send with integrationKey so proxy can hash
  const withKeyPayload = new URLSearchParams({
    id: ID, integrationKey: KEY, reference, amount,
    additionalinfo: "Test",
    returnurl: returnUrl,
    resulturl: resultUrl,
    authemail: EMAIL,
    status: "Message",
    phone,
    method: "ecocash",
  });

  const r2 = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: withKeyPayload.toString(),
  });
  const t2 = await r2.text();

  // Option 3: with KEY_USD
  const withKeyUSDPayload = new URLSearchParams({
    id: ID, integrationKey: KEY_USD, reference, amount,
    additionalinfo: "Test",
    returnurl: returnUrl,
    resulturl: resultUrl,
    authemail: EMAIL,
    status: "Message",
    phone,
    method: "ecocash",
  });

  const r3 = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: withKeyUSDPayload.toString(),
  });
  const t3 = await r3.text();

  return Response.json({
    no_hash: t1.substring(0, 300),
    with_key_default: t2.substring(0, 300),
    with_key_usd: t3.substring(0, 300),
  });
});