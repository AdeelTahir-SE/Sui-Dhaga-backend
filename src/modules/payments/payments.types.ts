export interface CreateCheckoutPayload {
  orderId: string;
  amount: number;
  provider: "stripe" | "safepay";
  currency?: string;
}

export interface ConfirmPaymentPayload {
  paymentId: string;
  transactionId: string;
  provider: "stripe" | "safepay";
}
