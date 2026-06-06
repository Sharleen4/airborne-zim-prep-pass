import { createHash } from 'node:crypto';

// Helper to test different field combinations
function testHash(fields, values, key) {
  let str = '';
  fields.forEach((f, i) => {
    if (values[f] !== undefined) {
      str += String(values[f]);
    }
  });
  str += key;
  return createHash("sha512").update(str, "utf8").digest("hex").toUpperCase();
}

Deno.serve(async (req) => {
  const { expected_prefix, id, reference, amount, additionalinfo, returnurl, resulturl, authemail, phone, method, status, key } = await req.json();

  const values = { id, reference, amount, additionalinfo, returnurl, resulturl, authemail, phone, method, status };

  // Test different field orders
  const orders = [
    // Current order (SDK style without auth fields)
    ['id', 'reference', 'amount', 'additionalinfo', 'phone', 'method', 'status'],
    // With auth fields
    ['id', 'reference', 'amount', 'additionalinfo', 'authemail', 'phone', 'method', 'status'],
    // Official doc order (if known)
    ['id', 'reference', 'amount', 'additionalinfo', 'returnurl', 'resulturl', 'authemail', 'status'],
    // All fields
    ['id', 'reference', 'amount', 'additionalinfo', 'returnurl', 'resulturl', 'authemail', 'phone', 'method', 'status'],
    // Without phone/method
    ['id', 'reference', 'amount', 'additionalinfo', 'returnurl', 'resulturl', 'authemail', 'status'],
  ];

  const results = [];
  for (const order of orders) {
    const hash = testHash(order, values, key);
    const matches = hash.startsWith(expected_prefix);
    results.push({
      order: order.join(' + '),
      hash: hash.substring(0, 16),
      matches,
    });
  }

  return Response.json({ expected: expected_prefix, results });
});