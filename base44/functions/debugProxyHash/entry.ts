import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const INTEGRATION_ID  = Deno.env.get("PAYNOW_INTEGRATION_ID");
const INTEGRATION_KEY = Deno.env.get("PAYNOW_INTEGRATION_KEY");
const MERCHANT_EMAIL  = Deno.env.get("PAYNOW_MERCHANT_EMAIL");
const PROXY_BASE      = "https://zamaaiproxy.sharleenbwakura.workers.dev";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const id            = INTEGRATION_ID;
  const key           = INTEGRATION_KEY;
  const reference     = "TEST-DEBUG-001";
  const amount        = "4.00";
  const additionalinfo= "Zamaai Standard 3-Month Access";
  const returnurl     = "https://zamaai.base44.app/payment-return";
  const resulturl     = "https://app-api.base44.com/api/apps/69ccd46e19848b833ca275ea/prod/functions/paynowWebhook";
  const authemail     = MERCHANT_EMAIL;
  const phone         = "2630771234567";
  const method        = "ecocash";
  const status        = "Message";

  // Option A: JSON with key field
  const rA = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, key, reference, amount, additionalinfo, returnurl, resulturl, authemail, status, phone, method }),
  });
  const tA = await rA.text();

  // Option B: form with key field
  const rB = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id, key, reference, amount, additionalinfo, returnurl, resulturl, authemail, status, phone, method }).toString(),
  });
  const tB = await rB.text();

  // Option C: JSON with integrationId + integrationKey
  const rC = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ integrationId: id, integrationKey: key, reference, amount, additionalinfo, returnurl, resulturl, authemail: MERCHANT_EMAIL, status, phone, method }),
  });
  const tC = await rC.text();

  // Option D: form with integrationId + integrationKey  
  const rD = await fetch(`${PROXY_BASE}/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ integrationId: id, integrationKey: key, reference, amount, additionalinfo, returnurl, resulturl, authemail: MERCHANT_EMAIL, status, phone, method }).toString(),
  });
  const tD = await rD.text();

  return Response.json({ A_json_key: tA, B_form_key: tB, C_json_integrationKey: tC, D_form_integrationKey: tD });
});