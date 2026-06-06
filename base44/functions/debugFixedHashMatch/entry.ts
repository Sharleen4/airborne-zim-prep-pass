// Test: send our CORRECT hash to proxy and see if Paynow accepts it
// Using the fixed reference so we can pre-compute the correct hash
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

Deno.serve(async (req) => {
  const reference  = "FIXED-REF-XYZABC-123";
  const amount     = "4.00";
  const returnUrl  = "https://zamaai.base44.app/payment-return?plan=3_month&ref=FIXED-REF-XYZABC-123";
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

  const ORDER = ["id", "reference", "amount", "additionalinfo", "returnurl", "resulturl", "authemail", "status"];
  const base = ORDER.map(k => fields[k] ?? "").join("");

  const hashDefault = await sha512upper(base + KEY);
  const hashUSD     = await sha512upper(base + KEY_USD);

  // Send WITH our pre-computed hash (default key) — does proxy pass it or override?
  const rA = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...fields, phone, method: "ecocash", hash: hashDefault }).toString(),
  });
  const tA = decodeURIComponent(await rA.text());

  // Send WITH our pre-computed hash (usd key)
  const rB = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...fields, phone, method: "ecocash", hash: hashUSD }).toString(),
  });
  const tB = decodeURIComponent(await rB.text());

  // Send with a WRONG hash (all zeros) — if proxy re-computes, expected prefix should be same as A/B
  const rC = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...fields, phone, method: "ecocash", hash: "0000000000000000000000000000000000000000000000000000000000000000" }).toString(),
  });
  const tC = decodeURIComponent(await rC.text());

  // Extract expected prefix from each response
  const extract = (t) => {
    const m = t.match(/start with[:\s]+([A-F0-9]{4,8})/i);
    return m ? m[1] : t.substring(0, 80);
  };

  return Response.json({
    our_hash_default_prefix: hashDefault.substring(0, 8),
    our_hash_usd_prefix: hashUSD.substring(0, 8),
    response_A_with_default_hash: extract(tA),
    response_B_with_usd_hash: extract(tB),
    response_C_with_wrong_hash: extract(tC),
    raw_A: tA.substring(0, 150),
    raw_B: tB.substring(0, 150),
    raw_C: tC.substring(0, 150),
    note: "If A and B return SAME expected prefix as C → proxy is overriding our hash. If different → proxy is passing our hash through.",
  });
});