// Debug: test with both integration ID/KEY combinations
const ID_DEFAULT  = Deno.env.get("PAYNOW_INTEGRATION_ID");
const KEY_DEFAULT = Deno.env.get("PAYNOW_INTEGRATION_KEY");
const ID_USD      = Deno.env.get("PAYNOW_INTEGRATION_ID_USD");
const KEY_USD     = Deno.env.get("PAYNOW_INTEGRATION_KEY_USD");
const MERCHANT_EMAIL = Deno.env.get("PAYNOW_MERCHANT_EMAIL");

async function sha512upper(str) {
  const encoded = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-512", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

Deno.serve(async (req) => {
  const reference     = "TEST-HASH-DEBUG-001";
  const amount        = "4.00";
  const description   = "Zamaai Standard 3-Month Access";
  const returnUrl     = "https://zamaai.base44.app/payment-return?plan=3_month&ref=TEST-HASH-DEBUG-001";
  const resultUrl     = "https://app-api.base44.com/api/apps/69ccd46e19848b833ca275ea/prod/functions/paynowWebhook";

  const ORDER = ["id", "reference", "amount", "additionalinfo", "returnurl", "resulturl", "authemail", "status"];

  async function computeHash(id, key) {
    const fields = {
      id, reference, amount,
      additionalinfo: description,
      returnurl: returnUrl,
      resulturl: resultUrl,
      authemail: MERCHANT_EMAIL,
      status: "Message",
    };
    const str = ORDER.map(k => fields[k] ?? "").join("") + key;
    return await sha512upper(str);
  }

  const hashDefault = await computeHash(ID_DEFAULT, KEY_DEFAULT);
  const hashUSD     = await computeHash(ID_USD, KEY_USD);

  return Response.json({
    default: {
      id_prefix:   ID_DEFAULT?.substring(0, 8),
      key_prefix:  KEY_DEFAULT?.substring(0, 8),
      hash_prefix: hashDefault.substring(0, 16),
    },
    usd: {
      id_prefix:   ID_USD?.substring(0, 8),
      key_prefix:  KEY_USD?.substring(0, 8),
      hash_prefix: hashUSD.substring(0, 16),
    },
  });
});