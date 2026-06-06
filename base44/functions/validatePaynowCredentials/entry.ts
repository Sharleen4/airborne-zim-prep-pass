import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createHash } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Check what credentials are actually loaded
    const integrationId = Deno.env.get("PAYNOW_INTEGRATION_ID_USD");
    const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY_USD");

    console.log("🔍 CREDENTIAL VALIDATION");
    console.log("Integration ID loaded:", integrationId ? "✓" : "✗");
    console.log("Integration Key loaded:", integrationKey ? "✓" : "✗");
    console.log("ID value (masked):", integrationId ? integrationId.substring(0, 5) + "..." : "NOT SET");
    console.log("Key value (masked):", integrationKey ? integrationKey.substring(0, 5) + "..." : "NOT SET");

    // Test hash with known values
    if (integrationId && integrationKey) {
      const testData = {
        id: integrationId,
        reference: "TEST-REF-001",
        amount: "1.00",
        additionalinfo: "Test",
        returnurl: "https://test.com/return",
        resulturl: "https://test.com/result",
        authemail: "test@example.com",
        status: "Message",
      };

      const hashStr = 
        testData.id +
        testData.reference +
        testData.amount +
        testData.additionalinfo +
        testData.returnurl +
        testData.resulturl +
        testData.authemail +
        testData.status +
        integrationKey;

      const testHash = createHash("sha512").update(hashStr, "utf8").digest("hex").toUpperCase();

      console.log("📋 TEST HASH GENERATION");
      console.log("Test reference:", testData.reference);
      console.log("Generated hash (first 12 chars):", testHash.substring(0, 12));
      console.log("Full test hash:", testHash);

      return Response.json({
        status: "ok",
        credentials_loaded: {
          id: !!integrationId,
          key: !!integrationKey,
          id_prefix: integrationId?.substring(0, 5),
          key_prefix: integrationKey?.substring(0, 5),
        },
        test_hash_result: {
          reference: testData.reference,
          hash_prefix: testHash.substring(0, 12),
          full_hash: testHash,
        },
        note: "If the hash prefix never matches Paynow's expected value, the integration ID or key may be incorrect.",
      });
    }

    return Response.json({
      error: "Missing credentials",
      credentials_loaded: {
        id: !!integrationId,
        key: !!integrationKey,
      },
    }, { status: 400 });
  } catch (error) {
    console.error("Validation error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});