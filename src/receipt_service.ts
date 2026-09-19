import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiError } from "./infrai_pdf.js";
import { receiptRequestSchema } from "./receipt_policy.js";
import { issueReceipt, ReceiptBlockedError } from "./receipt_sender.js";

const port = Number(process.env.PORT ?? 3000);
const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

function send(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/receipts") {
    send(response, 404, { error: "not_found" });
    return;
  }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = receiptRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const pdf = await issueReceipt(input, apiKey);
    send(response, 201, { paymentId: input.payment.id, shipmentReference: input.shipment.reference, pdf });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(response, 400, { error: "invalid_request" });
    } else if (error instanceof ReceiptBlockedError) {
      send(response, 409, { error: error.reason });
    } else if (error instanceof InfraiError) {
      send(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.code,
        message: error.message
      });
    } else {
      send(response, 502, { error: "receipt_generation_failed" });
    }
  }
}).listen(port, () => console.log(`Receipt service listening on http://localhost:${port}`));
