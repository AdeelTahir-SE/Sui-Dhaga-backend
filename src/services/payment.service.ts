import { env } from "../config/env.js";

export type SupportedPaymentProvider =
  | "stripe"
  | "safepay"
  | "jazzcash"
  | "easypaisa"
  | "sadapay"
  | "nayapay"
  | "cod";

export interface CreateCheckoutOptions {
  amount: number;
  currency: string;
  orderId: string;
  provider: SupportedPaymentProvider;
}

export const paymentService = {
  async createCheckoutSession(options: CreateCheckoutOptions) {
    const ref = `${options.provider}-${options.orderId}-${Date.now()}`;
    if (options.provider === "cod") {
      return {
        checkoutUrl: null,
        sessionId: `cod-${options.orderId}`,
        status: "cod_confirmed",
      };
    }
    if (options.provider === "stripe" && !env.STRIPE_SECRET_KEY) {
      return { checkoutUrl: `https://checkout.stripe.mock/${options.orderId}`, sessionId: ref };
    }
    if (options.provider === "safepay" && !env.SAFEPAY_SECRET_KEY) {
      return { checkoutUrl: `https://checkout.safepay.mock/${options.orderId}`, sessionId: ref };
    }
    if (["jazzcash", "easypaisa", "sadapay", "nayapay"].includes(options.provider)) {
      return {
        checkoutUrl: `https://checkout.${options.provider}.mock/${options.orderId}`,
        sessionId: ref,
      };
    }
    return { checkoutUrl: `https://checkout.mock/${options.orderId}`, sessionId: ref };
  },

  async verifyWebhookSignature(_payload: unknown, _signature: string, provider: SupportedPaymentProvider) {
    if (provider === "stripe" && !env.STRIPE_WEBHOOK_SECRET) return true;
    if (provider === "safepay" && !env.SAFEPAY_WEBHOOK_SECRET) return true;
    return true;
  },
};
