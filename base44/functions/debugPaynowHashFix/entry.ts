import { createHash } from 'node:crypto';

function hashIt(str) {
  return createHash("sha512").update(str, "utf8").digest("hex").toUpperCase();
}

// Test data from actual failing transaction
const PAYNOW_KEY = "492ab2a2-cf5f-4f51-ae5d-1b3156e2e20e"; // USD key from debugPaynowHash
const testData = {
  id: "24269",
  reference: "ZAMAAI-FIXED123",
  amount: "4.00",
  additionalinfo: "Zamaai Standard 3-Month Access",
  returnurl: "https://zamaai.base44.app/payment-return?plan=3_month&ref=ZAMAAI-FIXED123",
  resulturl: "https://app-api.base44.com/api/apps/69ccd46e19848b833ca275ea/prod/functions/paynowWebhook",
  authemail: "chipochashe.school@gmail.com",
  phone: "0771111111",
  method: "ecocash",
  status: "Message",
};

Deno.serve(async (req) => {
  const results = [];

  // Test 1: Current order (mobile with phone)
  const test1 = testData.id + testData.reference + testData.amount + testData.additionalinfo + 
                testData.returnurl + testData.resulturl + testData.authemail + testData.phone + 
                testData.method + testData.status + PAYNOW_KEY;
  const hash1 = hashIt(test1);
  results.push({
    name: "Current Mobile Order (with phone)",
    hashString: test1.substring(0, 100) + "...",
    hash: hash1.substring(0, 16),
  });

  // Test 2: Without phone
  const test2 = testData.id + testData.reference + testData.amount + testData.additionalinfo + 
                testData.returnurl + testData.resulturl + testData.authemail + 
                testData.method + testData.status + PAYNOW_KEY;
  const hash2 = hashIt(test2);
  results.push({
    name: "Without Phone",
    hashString: test2.substring(0, 100) + "...",
    hash: hash2.substring(0, 16),
  });

  // Test 3: Phone formatted (0771 → 263771)
  const formattedPhone = "263" + testData.phone.substring(1);
  const test3 = testData.id + testData.reference + testData.amount + testData.additionalinfo + 
                testData.returnurl + testData.resulturl + testData.authemail + formattedPhone + 
                testData.method + testData.status + PAYNOW_KEY;
  const hash3 = hashIt(test3);
  results.push({
    name: "With Formatted Phone (263771...)",
    hashString: test3.substring(0, 100) + "...",
    hash: hash3.substring(0, 16),
  });

  // Test 4: Only status + key (minimal)
  const test4 = testData.id + testData.reference + testData.amount + testData.additionalinfo + 
                testData.returnurl + testData.resulturl + testData.authemail + 
                testData.status + PAYNOW_KEY;
  const hash4 = hashIt(test4);
  results.push({
    name: "Status only (no method, no phone)",
    hashString: test4.substring(0, 100) + "...",
    hash: hash4.substring(0, 16),
  });

  // Test 5: Try different key ordering
  const test5 = PAYNOW_KEY + testData.id + testData.reference + testData.amount + testData.additionalinfo + 
                testData.returnurl + testData.resulturl + testData.authemail + formattedPhone + 
                testData.method + testData.status;
  const hash5 = hashIt(test5);
  results.push({
    name: "Key FIRST then fields",
    hashString: test5.substring(0, 100) + "...",
    hash: hash5.substring(0, 16),
  });

  // Test 6: Exact Paynow spec (mobile)
  const test6 = testData.id + testData.reference + testData.amount + testData.additionalinfo + 
                testData.returnurl + testData.resulturl + testData.authemail + formattedPhone + 
                "ecocash" + testData.status + PAYNOW_KEY;
  const hash6 = hashIt(test6);
  results.push({
    name: "Paynow Mobile Spec (exact order)",
    hashString: test6.substring(0, 100) + "...",
    hash: hash6.substring(0, 16),
  });

  return Response.json({
    expected_hash_starts_with: "3133DF",
    test_results: results,
    paynow_key_used: PAYNOW_KEY,
  }, { headers: { "Content-Type": "application/json" } });
});