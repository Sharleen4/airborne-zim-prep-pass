import { createHash } from 'node:crypto';

function hash512(str) {
  return createHash("sha512").update(str, "utf8").digest("hex").toUpperCase();
}

Deno.serve(async (req) => {
  const key = "492ab2a2-cf5f-4f51-ae5d-1b3156e2e20e";

  // Exact body we send (URL-encoded), then Paynow decodes it and hashes the decoded values
  const bodyStr = "id=24269&reference=ZAMAAI-FIXED123&amount=4.00&additionalinfo=Zamaai+Standard+3-Month+Access&returnurl=https%3A%2F%2Fzamaai.base44.app%2Fpayment-return%3Fplan%3D3_month%26ref%3DZAMAAI-FIXED123&resulturl=https%3A%2F%2Fapp-api.base44.com%2Fapi%2Fapps%2F69ccd46e19848b833ca275ea%2Fprod%2Ffunctions%2FpaynowWebhook&authemail=chipochashe.school%40gmail.com&phone=0771111111&method=ecocash&status=Message";

  const params = new URLSearchParams(bodyStr);
  
  // Hash over the decoded values in the order they appear in the body
  const decodedValues = [];
  for (const [k, v] of params.entries()) {
    decodedValues.push(v);
  }
  
  const hashStr = decodedValues.join("") + key;
  const result = hash512(hashStr);
  
  // Also try: what if proxy sends JSON to Paynow instead of form-encoded?
  // Or what if Paynow hashes the raw encoded values (not decoded)?
  const rawValues = ["24269", "ZAMAAI-FIXED123", "4.00", "Zamaai+Standard+3-Month+Access",
    "https%3A%2F%2Fzamaai.base44.app%2Fpayment-return%3Fplan%3D3_month%26ref%3DZAMAAI-FIXED123",
    "https%3A%2F%2Fapp-api.base44.com%2Fapi%2Fapps%2F69ccd46e19848b833ca275ea%2Fprod%2Ffunctions%2FpaynowWebhook",
    "chipochashe.school%40gmail.com", "0771111111", "ecocash", "Message"];
  const rawHash = hash512(rawValues.join("") + key);

  // What if the proxy sends JSON to Paynow?
  const jsonBody = JSON.stringify({
    id: "24269", reference: "ZAMAAI-FIXED123", amount: "4.00",
    additionalinfo: "Zamaai Standard 3-Month Access",
    returnurl: "https://zamaai.base44.app/payment-return?plan=3_month&ref=ZAMAAI-FIXED123",
    resulturl: "https://app-api.base44.com/api/apps/69ccd46e19848b833ca275ea/prod/functions/paynowWebhook",
    authemail: "chipochashe.school@gmail.com", phone: "0771111111", method: "ecocash", status: "Message"
  });
  const jsonHash = hash512(jsonBody + key);

  // What if integration ID 24269 actually maps to a DIFFERENT key? 
  // Let's try: what key would produce 1BCA70 for our input?
  // We can't brute force, but let's confirm our input string is correct by using a known working Paynow test integration
  // Paynow test integration: id=12345, key=SomeTestKey (from their docs)

  return Response.json({
    expected: "1BCA70",
    decoded_values_hash: result.substring(0, 6),
    raw_encoded_hash: rawHash.substring(0, 6),
    json_body_hash: jsonHash.substring(0, 6),
    decoded_values: decodedValues,
    full_hash: result,
  });
});