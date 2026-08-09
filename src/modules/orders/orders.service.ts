import {
  fetchResources,
  saveResource,
} from "../../utils/resource-helper.js";

export const ordersService = {
  async getOrders(userId: string | undefined, userRole: string | undefined, page?: number, limit?: number) {
    return fetchResources({
      resourceType: "orders",
      userId,
      userRole,
      page,
      limit,
    });
  },

  async getOrderById(orderId: string, userId: string | undefined, userRole: string | undefined) {
    const { singleRecord } = await fetchResources({
      resourceType: "orders",
      id: orderId,
      userId,
      userRole,
    });
    return singleRecord;
  },

  async createOrder(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "orders",
      userId,
      userRole,
      data,
    });
  },

  async updateOrderStatus(orderId: string, userId: string | undefined, userRole: string | undefined, status: string) {
    return saveResource({
      resourceType: "orders",
      id: orderId,
      userId,
      userRole,
      data: { status },
    });
  },

  async cancelOrder(orderId: string, userId: string | undefined, userRole: string | undefined) {
    return saveResource({
      resourceType: "orders",
      id: orderId,
      userId,
      userRole,
      data: { status: "cancelled" },
    });
  },

  async getOrderInvoice(orderId: string, userId: string | undefined, userRole: string | undefined) {
    const order = await this.getOrderById(orderId, userId, userRole);
    return {
      invoiceId: `INV-${orderId.substring(0, 8).toUpperCase()}`,
      order,
      generatedAt: new Date().toISOString(),
    };
  },

  async getOrderTracking(orderId: string, userId: string | undefined, userRole: string | undefined) {
    const { records } = await fetchResources({
      resourceType: `order_tracking_${orderId}`,
      userId,
      userRole,
    });
    return records;
  },

  async addOrderTracking(orderId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: `order_tracking_${orderId}`,
      userId,
      userRole,
      data,
    });
  },

  async updateOrderTracking(trackingId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "order_tracking",
      id: trackingId,
      userId,
      userRole,
      data,
    });
  },
};
