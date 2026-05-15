import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentCheckoutSession,
  PaymentProviderName,
  PaymentProviderWebhookEvent
} from "../../types/src/index.ts";

export interface CreateProviderCheckoutSessionInput {
  invoiceId: string;
  invoiceNumber: string;
  customerEmail: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export interface VerifyProviderWebhookInput {
  payload: string;
  signature?: string;
}

export interface SignedProviderWebhookPayload {
  payload: string;
  signature: string;
}

export interface PaymentProviderAdapter {
  providerName: PaymentProviderName;
  createCheckoutSession(input: CreateProviderCheckoutSessionInput): Promise<PaymentCheckoutSession> | PaymentCheckoutSession;
  verifyWebhook(input: VerifyProviderWebhookInput): Promise<PaymentProviderWebhookEvent> | PaymentProviderWebhookEvent;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export class MemoryStripePaymentProvider implements PaymentProviderAdapter {
  readonly providerName: PaymentProviderName = "stripe";
  private readonly signingSecret: string;
  private readonly now: () => Date;
  private counter = 0;

  constructor(signingSecret: string, now?: () => Date) {
    this.signingSecret = signingSecret;
    this.now = now ?? (() => new Date());
  }

  createCheckoutSession(input: CreateProviderCheckoutSessionInput): PaymentCheckoutSession {
    this.counter += 1;
    return {
      id: `cs_test_${this.counter}`,
      provider: "stripe",
      checkoutUrl: `https://checkout.stripe.local/session/cs_test_${this.counter}`,
      clientReference: `${input.invoiceId}:${this.counter}`,
      amountCents: input.amountCents,
      currency: input.currency,
      invoiceId: input.invoiceId,
      expiresAt: new Date(this.now().getTime() + 30 * 60 * 1000).toISOString()
    };
  }

  verifyWebhook(input: VerifyProviderWebhookInput): PaymentProviderWebhookEvent {
    if (!input.signature) {
      throw new Error("Missing Stripe webhook signature.");
    }

    const expected = signPayload(input.payload, this.signingSecret);

    if (!safeEquals(input.signature, expected)) {
      throw new Error("Stripe webhook signature mismatch.");
    }

    return JSON.parse(input.payload) as PaymentProviderWebhookEvent;
  }

  signWebhookEvent(event: PaymentProviderWebhookEvent): SignedProviderWebhookPayload {
    const payload = JSON.stringify(event);
    return {
      payload,
      signature: signPayload(payload, this.signingSecret)
    };
  }
}
