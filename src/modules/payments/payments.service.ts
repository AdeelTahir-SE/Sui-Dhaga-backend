import {
  fetchResources,
  saveResource,
} from "../../utils/resource-helper.js";

export const paymentsService = {
  async createCheckout(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "payments",
      userId,
      userRole,
      data: { ...data, status: "pending_checkout" },
    });
  },

  async confirmPayment(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "payments",
      userId,
      userRole,
      data: { ...data, status: "completed" },
    });
  },

  async getPaymentHistory(userId: string | undefined, userRole: string | undefined, page?: number, limit?: number) {
    return fetchResources({
      resourceType: "payments",
      userId,
      userRole,
      page,
      limit,
    });
  },

  async getPaymentById(paymentId: string, userId: string | undefined, userRole: string | undefined) {
    const { singleRecord } = await fetchResources({
      resourceType: "payments",
      id: paymentId,
      userId,
      userRole,
    });
    return singleRecord;
  },

  async handleWebhook(data: Record<string, unknown>) {
    return saveResource({
      resourceType: "payments",
      data: { ...data, webhookReceived: true },
    });
  },
};
