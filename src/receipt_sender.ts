import type { ReceiptRequest } from "./receipt_policy.js";
import { decideReceipt } from "./receipt_policy.js";
import { generateReceiptPdf, type GeneratedPdf } from "./infrai_pdf.js";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
}[character] as string));

export class ReceiptBlockedError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`Receipt blocked: ${reason}`);
    this.reason = reason;
  }
}

export async function issueReceipt(
  input: ReceiptRequest,
  apiKey: string,
  fetcher: typeof fetch = fetch
): Promise<GeneratedPdf> {
  const decision = decideReceipt(input);
  if (decision.issue === false) throw new ReceiptBlockedError(decision.reason);

  const podRows = input.shipment.proofOfDelivery
    .map((file) => `<li>${escapeHtml(file.name)} (${escapeHtml(file.capturedAt)})</li>`)
    .join("");
  const html = `<!doctype html><html><body><h1>Payment receipt</h1><dl>` +
    `<dt>Payment</dt><dd>${escapeHtml(input.payment.id)}</dd>` +
    `<dt>Amount</dt><dd>${input.payment.amount.toFixed(2)} ${escapeHtml(input.payment.currency)}</dd>` +
    `<dt>Shipment</dt><dd>${escapeHtml(input.shipment.reference)}</dd>` +
    `<dt>Carrier</dt><dd>${escapeHtml(input.shipment.carrier)}</dd>` +
    `<dt>Delivered</dt><dd>${escapeHtml(decision.deliveredAt)}</dd>` +
    `</dl><h2>Proof of delivery</h2><ul>${podRows}</ul></body></html>`;

  return generateReceiptPdf(html, input.payment.id, apiKey, fetcher);
}
