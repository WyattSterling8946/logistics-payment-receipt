import assert from "node:assert/strict";
import test from "node:test";
import { decideReceipt, receiptRequestSchema } from "../src/receipt_policy.js";

const base = {
  payment: {
    id: "pay_001",
    status: "paid" as const,
    amount: 1840.5,
    currency: "USD",
    paidAt: "2026-09-03T08:30:00.000Z"
  },
  shipment: {
    reference: "SHP-88421",
    carrier: "Northline Freight",
    events: [{ kind: "delivered" as const, occurredAt: "2026-09-03T07:45:00.000Z" }],
    proofOfDelivery: [{
      name: "signed-delivery-note.pdf",
      sha256: "a".repeat(64),
      capturedAt: "2026-09-03T07:46:00.000Z"
    }],
    exceptions: []
  }
};

test("an open shipment exception blocks receipt issuance", () => {
  const input = receiptRequestSchema.parse({
    ...base,
    shipment: {
      ...base.shipment,
      exceptions: [{ code: "DAMAGED_CARTON", summary: "Carton inspection pending" }]
    }
  });
  assert.deepEqual(decideReceipt(input), { issue: false, reason: "exception_open" });
});

test("a settled and delivered shipment is ready for a receipt", () => {
  const input = receiptRequestSchema.parse(base);
  assert.deepEqual(decideReceipt(input), {
    issue: true,
    deliveredAt: "2026-09-03T07:45:00.000Z"
  });
});
