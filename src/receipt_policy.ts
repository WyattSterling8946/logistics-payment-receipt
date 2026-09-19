import { z } from "zod";

export const receiptRequestSchema = z.object({
  payment: z.object({
    id: z.string().min(1),
    status: z.enum(["pending", "paid", "refunded"]),
    amount: z.number().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    paidAt: z.string().datetime()
  }),
  shipment: z.object({
    reference: z.string().min(1),
    carrier: z.string().min(1),
    events: z.array(z.object({
      kind: z.enum(["picked_up", "in_transit", "delivered", "exception"]),
      occurredAt: z.string().datetime(),
      note: z.string().min(1).optional()
    })).min(1),
    proofOfDelivery: z.array(z.object({
      name: z.string().min(1),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      capturedAt: z.string().datetime()
    })).min(1),
    exceptions: z.array(z.object({
      code: z.string().min(1),
      summary: z.string().min(1),
      resolvedAt: z.string().datetime().optional()
    })).default([])
  })
});

export type ReceiptRequest = z.infer<typeof receiptRequestSchema>;

export type ReceiptDecision =
  | { issue: true; deliveredAt: string }
  | { issue: false; reason: "payment_not_settled" | "delivery_not_recorded" | "exception_open" };

export function decideReceipt(input: ReceiptRequest): ReceiptDecision {
  if (input.payment.status !== "paid") return { issue: false, reason: "payment_not_settled" };
  if (input.shipment.exceptions.some((exception) => !exception.resolvedAt)) {
    return { issue: false, reason: "exception_open" };
  }
  const delivered = [...input.shipment.events]
    .filter((event) => event.kind === "delivered")
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  if (!delivered) return { issue: false, reason: "delivery_not_recorded" };
  return { issue: true, deliveredAt: delivered.occurredAt };
}
