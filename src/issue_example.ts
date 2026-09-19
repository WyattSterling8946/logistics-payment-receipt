import { receiptRequestSchema } from "./receipt_policy.js";
import { issueReceipt } from "./receipt_sender.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the example");

const request = receiptRequestSchema.parse({
  payment: {
    id: "pay_2026_0903_001",
    status: "paid",
    amount: 1840.5,
    currency: "USD",
    paidAt: "2026-09-03T08:30:00.000Z"
  },
  shipment: {
    reference: "SHP-88421",
    carrier: "Northline Freight",
    events: [
      { kind: "picked_up", occurredAt: "2026-09-01T09:00:00.000Z" },
      { kind: "delivered", occurredAt: "2026-09-03T07:45:00.000Z" }
    ],
    proofOfDelivery: [{
      name: "signed-delivery-note.pdf",
      sha256: "a".repeat(64),
      capturedAt: "2026-09-03T07:46:00.000Z"
    }],
    exceptions: []
  }
});

console.log(JSON.stringify(await issueReceipt(request, apiKey), null, 2));
