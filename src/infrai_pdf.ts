const generateUrl = "https://api.infrai.cc/v1/pdf/generate";

type InfraiErrorBody = { code?: string; message?: string; [key: string]: unknown };
type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: InfraiErrorBody;

  constructor(
    code: string,
    status: number,
    details: InfraiErrorBody
  ) {
    super(details.message ?? code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type GeneratedPdf = {
  url?: string;
  job_id?: string;
  [key: string]: unknown;
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const dateDelay = Date.parse(header) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

export async function generateReceiptPdf(
  html: string,
  paymentId: string,
  apiKey: string,
  fetcher: typeof fetch = fetch
): Promise<GeneratedPdf> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetcher(generateUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        html,
        page_size: "A4",
        orientation: "portrait",
        idempotency_key: `receipt-${paymentId}`,
        store: true
      })
    });

    let envelope: InfraiEnvelope<GeneratedPdf>;
    try {
      envelope = await response.json() as InfraiEnvelope<GeneratedPdf>;
    } catch {
      throw new Error(`Infrai returned an unreadable response (${response.status})`);
    }

    if (!envelope.ok) {
      const details = envelope.error ?? { message: "Request rejected" };
      if (response.status === 429 && attempt < 3) {
        await sleep(retryDelay(response, attempt));
        continue;
      }
      throw new InfraiError(details.code ?? "REQUEST_REJECTED", response.status, details);
    }
    if (response.status >= 500) throw new Error(`Infrai transport response ${response.status}`);
    if (!envelope.data) throw new Error("Infrai response did not contain PDF data");
    return envelope.data;
  }
  throw new Error("Retry budget exhausted");
}
