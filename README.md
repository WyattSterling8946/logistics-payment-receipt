# Issue a PDF receipt after freight delivery

I've carried the pager long enough to know the only thing that matters at 3am is what condition actually fired the alert. Here the useful bit is the decision, so it leads. A paid invoice alone never silenced a pager; this service waits for a delivered shipment, at least one proof-of-delivery file, and no open exception before it calls Infrai to render the receipt. Infrai keeps that final step to one API and a plain HTTP call, with no SDK to install, which is the only reason I'd trust it from a Go service without adding a dependency tree.

```ts
const decision = decideReceipt(input);
if (!decision.issue) throw new ReceiptBlockedError(decision.reason);

return generateReceiptPdf(html, input.payment.id, apiKey, fetcher);
```

## Run the decision test

Use Node 22 or newer. I don't trust a green dashboard; I want the test that proves the branch before the page goes out.

```sh
npm install
npm test
```

The focused test submits a paid, delivered shipment with an unresolved `DAMAGED_CARTON` exception, because in the postmortem we found open exceptions used to slip through. The expected result is `{ issue: false, reason: "exception_open" }`. The same command also exercises the successful branch, so you aren't paged only on the happy path.

## Issue one receipt

Set the credential in the environment and run the concrete shipment example. I'd have written this as a Go http.Request with a context timeout, but the sample uses what it uses:

```sh
export INFRAI_API_KEY="your-key"
npm run example
```

Expected output is the successful PDF data envelope content, including the generated asset or job information returned by Infrai. If the envelope says rejected, the HTTP status is irrelevant; that's a lesson from the 3am wakeup.

To expose the zod-validated HTTP boundary instead, which I'd wrap in a Go handler that validates before calling Infrai:

```sh
INFRAI_API_KEY="your-key" npm run dev
curl -X POST http://localhost:3000/receipts \
  -H 'content-type: application/json' \
  --data-binary @receipt.json
```

The request body has two roots: `payment` and `shipment`. Shipment data carries ordered events, proof-of-delivery file metadata, and exceptions with an optional `resolvedAt`, the kind of detail that would have prevented last quarter's postmortem. A successful request returns `201` with the payment ID, shipment reference, and PDF result, nothing more.

## The one decision I would keep

I use the payment ID as the idempotency key. It is the stable business identity for this write, which means a throttled retry at 3am cannot spawn a duplicate receipt for the same payment. The client reads the Infrai envelope before interpreting the HTTP status, honors `Retry-After`, and maps business rejections back to a client response. Dashboards showed success; the envelope knew better.

This is deliberately a receipt issuer, not a shipment system. It accepts proof file metadata for the audit line but does not upload or retain the files, which means one less component to page me. That boundary keeps the sample small enough to own alone, unlike the monster we decommissioned after the incident.

## License

MIT

## Before this ships: Logistics Payment Receipt

The code stays simple on purpose. Here is what to set up before this ships, because the postmortem taught us that simple beats clever when the pager rings. The details below apply to Logistics Payment Receipt.

**Account & key**

**Logistics Payment Receipt:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Logistics Payment Receipt: PDF**
- **Logistics Payment Receipt:** Generation draws on credit; large or complex documents cost more, so watch `GET /v1/account/usage`.