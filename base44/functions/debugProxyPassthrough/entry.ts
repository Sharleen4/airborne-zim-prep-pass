// Test if proxy passes our hash through or overrides it
const PROXY_BASE = "https://zamaaiproxy.sharleenbwakura.workers.dev";
const ID  = Deno.env.get("PAYNOW_INTEGRATION_ID");
const KEY = Deno.env.get("PAYNOW_INTEGRATION_KEY");
const KEY_USD = Deno.env.get("PAYNOW_INTEGRATION_KEY_USD");
const EMAIL = Deno.env.get("PAYNOW_MERCHANT_EMAIL");

async function sha512upper(str) {
  const encoded = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-512", encoded);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("").toUpperCase();
}

async function makeHash(fields, key) {
  const ORDER = ["id", "reference", "amount", "additionalinfo", "returnurl", "resulturl", "authemail", "status"];
  let str = ORDER.map(k => fields[k] ?? "").join("") + key;
  return await sha512upper(str);
}

Deno.serve(async (req) => {
  const reference  = `PROBE-${Date.now()}`;
  const amount     = "4.00";
  const returnUrl  = "https://zamaai.base44.app/payment-return";
  const resultUrl  = "https://app-api.base44.com/api/apps/69ccd46e19848b833ca275ea/prod/functions/paynowWebhook";
  const phone      = "2630771234567";

  const fields = {
    id: ID, reference, amount,
    additionalinfo: "Zamaai Standard 3-Month Access",
    returnurl: returnUrl,
    resulturl: resultUrl,
    authemail: EMAIL,
    status: "Message",
  };

  const hashDefault = await makeHash(fields, KEY);
  const hashUSD     = await makeHash(fields, KEY_USD);

  // Test A: send our pre-computed hash with default key — does proxy pass it through?
  const rA = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...fields, phone, method: "ecocash", hash: hashDefault }).toString(),
  });
  const tA = await rA.text();

  // Test B: send our pre-computed hash with USD key
  const rB = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...fields, phone, method: "ecocash", hash: hashUSD }).toString(),
  });
  const tB = await rB.text();

  // Test C: send integrationKey field so proxy can hash correctly
  const rC = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...fields, phone, method: "ecocash", integrationKey: KEY }).toString(),
  });
  const tC = await rC.text();

  // Test D: send integrationKey = KEY_USD
  const rD = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...fields, phone, method: "ecocash", integrationKey: KEY_USD }).toString(),
  });
  const tD = await rD.text();

  return Response.json({
    hash_default_prefix: hashDefault.substring(0, 8),
    hash_usd_prefix: hashUSD.substring(0, 8),
    A_hash_default_passthrough: decodeURIComponent(tA).substring(0, 200),
    B_hash_usd_passthrough: decodeURIComponent(tB).substring(0, 200),
    C_integrationKey_default: decodeURIComponent(tC).substring(0, 200),
    D_integrationKey_usd: decodeURIComponent(tD).substring(0, 200),
  });
});