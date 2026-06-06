// Use a FIXED reference to compare the proxy's expected hash against our computed hashes
// Goal: find which key the proxy is using when it re-hashes
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
  const reference  = "FIXED-REF-XYZABC-123";  // Fixed reference
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

  // Send to proxy WITHOUT hash — proxy will compute expected hash with its own key
  // Paynow will reject and tell us what it expected
  const r = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...fields, phone, method: "ecocash" }).toString(),
  });
  const text = decodeURIComponent(await r.text());

  // Extract expected prefix from "Hash should start with: XXXXXX"
  const match = text.match(/start with:\s*([A-F0-9]+)/i);
  const expectedPrefix = match ? match[1] : "unknown";

  // Compute our hashes for the SAME fixed reference
  const ORDER = ["id", "reference", "amount", "additionalinfo", "returnurl", "resulturl", "authemail", "status"];
  const base = ORDER.map(k => fields[k] ?? "").join("");

  const hashDefault = await sha512upper(base + KEY);
  const hashUSD     = await sha512upper(base + KEY_USD);

  // Also check if proxy might skip authemail
  const baseNoAuth = ["id","reference","amount","additionalinfo","returnurl","resulturl","status"].map(k => fields[k] ?? "").join("");
  const hashNoAuthDefault = await sha512upper(baseNoAuth + KEY);
  const hashNoAuthUSD     = await sha512upper(baseNoAuth + KEY_USD);

  return Response.json({
    paynow_expected_prefix: expectedPrefix,
    our_hash_default:     hashDefault.substring(0, 8),
    our_hash_usd:         hashUSD.substring(0, 8),
    our_hash_no_auth_default: hashNoAuthDefault.substring(0, 8),
    our_hash_no_auth_usd:     hashNoAuthUSD.substring(0, 8),
    full_hashes: {
      default: hashDefault,
      usd: hashUSD,
      no_auth_default: hashNoAuthDefault,
      no_auth_usd: hashNoAuthUSD,
    },
    raw_response: text.substring(0, 300),
    string_used: (base + KEY).substring(0, 120),
  });
});