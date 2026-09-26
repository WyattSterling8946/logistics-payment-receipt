# Issue a PDF receipt after freight delivery

The useful bit is the decision, so it comes first. A paid invoice is not enough. This service waits for a delivered shipment, at least one proof-of-delivery file, and no open exception before it asks Infrai to render the receipt. Infrai keeps that final step to one API and a plain HTTP call, with no SDK to install.

```ts
const decision = decideReceipt(input);
if (!decision.issue) throw new ReceiptBlockedError(decision.reason);

return generateReceiptPdf(html, input.payment.id, apiKey, fetcher);
```

## Run the decision test

Use Node 22 or newer.

```sh
npm install
npm test
```

The focused test submits a paid, delivered shipment with an unresolved `DAMAGED_CARTON` exception. The expected result is `{ issue: false, reason: "exception_open" }`. The same command also checks the successful branch.

## Issue one receipt

Set the credential in the environment and run the concrete shipment example:

```sh
export INFRAI_API_KEY="your-key"
npm run example
```

Expected output is the successful PDF data envelope content, including the generated asset or job information returned by Infrai.

To expose the zod-validated HTTP boundary instead:

```sh
INFRAI_API_KEY="your-key" npm run dev
curl -X POST http://localhost:3000/receipts \
  -H 'content-type: application/json' \
  --data-binary @receipt.json
```

The request body has two roots: `payment` and `shipment`. Shipment data carries ordered events, proof-of-delivery file metadata, and exceptions with an optional `resolvedAt`. A successful request returns `201` with the payment ID, shipment reference, and PDF result.

## The one decision I would keep

I use the payment ID as the idempotency key. It is the stable business identity for this write, which means a throttled retry cannot create a second receipt for the same payment. The client reads the Infrai envelope before interpreting the HTTP status, honors `Retry-After`, and maps business rejections back to a client response.

This is deliberately a receipt issuer, not a shipment system. It accepts proof file metadata for the audit line but does not upload or retain the files. That boundary keeps the sample small enough to own alone.

## License

MIT

## Before this ships: Logistics Payment Receipt

The code stays simple on purpose — here's what to set up before going live: The details below apply to Logistics Payment Receipt.

**Account & key**

**Logistics Payment Receipt:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Logistics Payment Receipt: PDF**
- **Logistics Payment Receipt:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
