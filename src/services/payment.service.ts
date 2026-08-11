import { env } from "../config/env.js";

export interface CreateCheckoutOptions {
  amount: number;
  currency: string;
  orderId: string;
  provider: "stripe" | "safepay";
}

export const paymentService = {
  async createCheckoutSession(options: CreateCheckoutOptions) {
    if (options.provider === "stripe" && !env.STRIPE_SECRET_KEY) {
      return { checkoutUrl: `https://checkout.stripe.mock/${options.orderId}`, sessionId: "mock-stripe-session" };
    }
    if (options.provider === "safepay" && !env.SAFEPAY_SECRET_KEY) {
      return { checkoutUrl: `https://checkout.safepay.mock/${options.orderId}`, sessionId: "mock-safepay-session" };
    }
    return { checkoutUrl: `https://checkout.mock/${options.orderId}`, sessionId: "mock-session" };
  },

  async verifyWebhookSignature(payload: unknown, signature: string, provider: "stripe" | "safepay") {
    if (provider === "stripe" && !env.STRIPE_WEBHOOK_SECRET) return true;
    if (provider === "safepay" && !env.SAFEPAY_WEBHOOK_SECRET) return true;
    return true;
  },
};
