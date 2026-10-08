import {
  getDbClient,
  toSnakeCase,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { notificationsService } from "../notifications/notifications.service.js";


function formatOrderRecord(order: any) {
  if (!order) return order;
  const price = Number(order.total_amount ?? order.totalAmount ?? order.price ?? order.amount ?? 0);
  const rawDesignImages = order.design_images ?? order.designImages ?? (order.design?.images ? order.design.images : []);
  const designImages = Array.isArray(rawDesignImages) ? rawDesignImages : [];
  const firstDesignImg =
    (designImages.length > 0 ? designImages[0] : null) ??
    order.design?.image_url ??
    order.design?.image ??
    order.imageUrl ??
    order.image ??
    null;

  // Actual Customer Information
  const customerName =
    order.customer?.full_name ||
    order.customer?.fullName ||
    order.customer?.name ||
    order.customer_name ||
    order.customerName ||
    "Client";

  const customerPhone =
    order.customer?.phone ||
    order.customer_phone ||
    order.customerPhone ||
    null;

  const customerAvatar =
    order.customer?.avatar_url ||
    order.customer?.avatarUrl ||
    order.customer_avatar ||
    order.customerAvatar ||
    null;

  const customerAddress =
    order.customer?.address ||
    order.delivery_address ||
    order.deliveryAddress ||
    null;

  const customerCity =
    order.customer?.city ||
    (order.customer?.address ? order.customer.address.split(",")[0].trim() : null) ||
    order.customer_city ||
    order.customerCity ||
    null;

  // Actual Tailor Information
  const tailorName =
    order.tailor?.profile?.full_name ||
    order.tailor?.profile?.fullName ||
    order.tailor?.shop_name ||
    order.tailor?.shopName ||
    order.tailor_name ||
    order.tailorName ||
    "Master Tailor";

  const tailorShopName =
    order.tailor?.shop_name ||
    order.tailor?.shopName ||
    (order.tailor?.profile?.full_name ? `${order.tailor.profile.full_name}'s Tailoring` : "Tailor Studio");

  const tailorAvatar =
    order.tailor?.banner_url ||
    order.tailor?.bannerUrl ||
    order.tailor?.profile?.avatar_url ||
    order.tailor?.profile?.avatarUrl ||
    order.tailor_avatar ||
    order.tailorAvatar ||
    null;

  const tailorPhone =
    order.tailor?.profile?.phone ||
    order.tailor_phone ||
    order.tailorPhone ||
    null;

  const tailorCity =
    order.tailor?.city ||
    order.tailor?.address ||
    order.tailor?.profile?.address ||
    order.tailor_city ||
    order.tailorCity ||
    null;

  const rawSpecialties =
    order.tailor?.specialties ||
    (order.tailor?.specialty ? [order.tailor.specialty] : []);
  const tailorSpecialties = Array.isArray(rawSpecialties) ? rawSpecialties : [];
  const tailorSpecialty =
    tailorSpecialties[0] ||
    order.tailor_specialty ||
    order.tailorSpecialty ||
    null;

  const tailorRating =
    order.tailor?.rating !== undefined && order.tailor?.rating !== null
      ? Number(order.tailor.rating)
      : (order.tailor_rating ?? order.tailorRating ?? null);

  const tailorReviewCount =
    order.tailor?.review_count !== undefined && order.tailor?.review_count !== null
      ? Number(order.tailor.review_count)
      : (order.tailor?.reviewCount !== undefined && order.tailor?.reviewCount !== null
          ? Number(order.tailor.reviewCount)
          : null);

  const tailorVerified = Boolean(
    order.tailor?.verified ||
    order.tailor?.verification_status === "verified" ||
    order.tailor_verified
  );

  const orderId = order.id;
  const orderNumber = order.order_number || order.orderNumber || (orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : undefined);
  const customerId = order.customer_id || order.customerId;
  const tailorId = order.tailor_id || order.tailorId;
  const itemName = order.item_name || order.itemName || "Custom Garment";
  const additionalNotes = order.additional_notes || order.additionalNotes || order.notes || null;
  const deliveryDate = order.delivery_date || order.deliveryDate || null;

  return {
    id: orderId,
    orderNumber,
    customerId,
    tailorId,
    status: order.status || "pending",
    itemName,
    price,
    imageUrl: firstDesignImg,
    designImages,
    deliveryDate,
    additionalNotes,
    measurements: order.measurements ?? {},

    // Customer details matching mobile app
    customerName,
    customerPhone,
    customerAvatar,
    customerAddress,
    customerCity,
    customer: order.customer
      ? {
          id: order.customer.id || customerId,
          fullName: customerName,
          phone: customerPhone,
          avatarUrl: customerAvatar,
          address: customerAddress,
          city: customerCity,
        }
      : null,

    // Tailor details matching mobile app
    tailorName,
    tailorShopName,
    tailorAvatar,
    tailorPhone,
    tailorCity,
    tailorSpecialties,
    tailorRating,
    tailorReviewCount,
    tailorVerified,
    tailor: order.tailor
      ? {
          id: order.tailor.id || tailorId,
          userId: order.tailor.user_id || order.tailor.userId,
          name: tailorName,
          shopName: tailorShopName,
          avatarUrl: tailorAvatar,
          phone: tailorPhone,
          city: tailorCity,
          address: order.tailor.address || tailorCity,
          rating: tailorRating,
          reviewCount: tailorReviewCount,
          specialties: tailorSpecialties,
          verified: tailorVerified,
        }
      : null,

    createdAt: order.created_at || order.createdAt,
    updatedAt: order.updated_at || order.updatedAt,
  };
}

async function hydrateOrderParties(client: any, order: any) {
  if (!order) return order;

  // 1. Resolve Customer Profile
  if (order.customer_id && (!order.customer || !order.customer.full_name)) {
    try {
      const { data: custProf } = await client
        .from("profiles")
        .select("id, full_name, phone, address, avatar_url")
        .eq("id", order.customer_id)
        .maybeSingle();
      if (custProf) {
        order.customer = { ...order.customer, ...custProf };
      }
    } catch {}
  }

  // 2. Resolve Tailor & Profile
  const tailorRef = order.tailor_id;
  if (tailorRef) {
    try {
      if (order.tailor && order.tailor.user_id && !order.tailor.profile) {
        const { data: tailorUserProf } = await client
          .from("profiles")
          .select("id, full_name, phone, address, avatar_url")
          .eq("id", order.tailor.user_id)
          .maybeSingle();
        if (tailorUserProf) {
          order.tailor.profile = tailorUserProf;
        }
      } else if (!order.tailor) {
        const { data: tRec } = await client
          .from("tailors")
          .select("id, user_id, shop_name, city, address, rating, review_count, banner_url, verified, specialties, profile:profiles(id, full_name, phone, address, avatar_url)")
          .or(`id.eq.${tailorRef},user_id.eq.${tailorRef}`)
          .maybeSingle();
        if (tRec) {
          order.tailor = tRec;
        } else {
          const { data: profRec } = await client
            .from("profiles")
            .select("id, full_name, phone, address, avatar_url")
            .eq("id", tailorRef)
            .maybeSingle();
          if (profRec) {
            order.tailor = {
              id: tailorRef,
              user_id: profRec.id,
              shop_name: profRec.full_name ? `${profRec.full_name}'s Tailoring` : "Tailor Studio",
              city: profRec.address || "Lahore",
              address: profRec.address || "",
              rating: null,
              review_count: 0,
              specialties: ["Custom Tailoring"],
              profile: profRec,
            };
          }
        }
      }
    } catch {}
  }

  return order;
}

export const ordersService = {
  async getOrders(userId: string | undefined, userRole: string | undefined, page = 1, limit = 20) {
    const client = getDbClient();
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));

    let query = client
      .from("orders")
      .select("id, customer_id, tailor_id, item_name, total_amount, status, delivery_date, additional_notes, design_images, measurements, created_at, updated_at, customer:profiles!customer_id(id, full_name, phone, avatar_url, address), tailor:tailors!tailor_id(id, user_id, shop_name, rating, review_count, city, address, banner_url, verified, profile:profiles(id, full_name, phone, avatar_url))", { count: "exact" });

    if (userId && userRole !== "admin") {
      if (userRole === "tailor") {
        const { data: tailor } = await client.from("tailors").select("id").eq("user_id", userId).maybeSingle();
        if (tailor?.id) {
          query = query.eq("tailor_id", tailor.id);
        } else {
          query = query.eq("tailor_id", userId);
        }
      } else {
        query = query.eq("customer_id", userId);
      }
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range((p - 1) * l, p * l - 1);

    if (error) throw new AppError(error.message, 400);

    const hydratedList = await Promise.all(
      (data ?? []).map(async (item) => {
        const hydrated = await hydrateOrderParties(client, item);
        return formatOrderRecord(hydrated);
      })
    );

    return {
      records: hydratedList,
      page: p,
      limit: l,
      total: count ?? 0,
      singleRecord: null,
    };
  },

  async getOrderById(orderId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { data, error } = await client
      .from("orders")
      .select("id, customer_id, tailor_id, service_id, design_id, measurement_id, item_name, total_amount, status, delivery_date, additional_notes, design_images, measurements, created_at, updated_at, customer:profiles!customer_id(id, full_name, phone, avatar_url, address), tailor:tailors!tailor_id(id, user_id, shop_name, rating, review_count, city, address, banner_url, verified, specialties, profile:profiles(id, full_name, phone, avatar_url)), service:tailor_services!service_id(id, title, price, category), design:designs!design_id(id, title, image_url), measurement:measurements!measurement_id(id, title, chest, waist, hips, shoulder, sleeve_length, inseam, neck), tracking:order_tracking(id, status, description, location, created_at)")
      .eq("id", orderId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    if (!data) return null;

    const hydrated = await hydrateOrderParties(client, data);
    return formatOrderRecord(hydrated);
  },

  async createOrder(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();

    const rawTailorId = (data.tailorId ?? data.tailor_id) as string;
    if (!rawTailorId) throw new AppError("tailorId is required", 400);

    // Resolve tailor id in case tailor's user_id or profile id was passed
    let tailorId = rawTailorId;
    try {
      const { data: tailorRec } = await client
        .from("tailors")
        .select("id")
        .or(`id.eq.${rawTailorId},user_id.eq.${rawTailorId}`)
        .maybeSingle();
      if (tailorRec?.id) {
        tailorId = tailorRec.id;
      }
    } catch {}

    const totalAmount = Number(data.totalAmount ?? data.total_amount ?? data.price ?? data.amount ?? 0);
    const itemName = (data.itemName ?? data.item_name) as string | undefined;
    const additionalNotes = (data.additionalNotes ?? data.additional_notes ?? data.notes) as string | undefined ?? null;
    const deliveryDate = (data.deliveryDate ?? data.delivery_date) as string | undefined ?? null;
    const designImages = (data.designImages ?? data.design_images ?? []) as string[];
    const measurements = (data.measurements ?? {}) as Record<string, unknown>;
    const serviceId = (data.serviceId ?? data.service_id) as string | undefined;
    const designId = (data.designId ?? data.design_id) as string | undefined;
    const measurementId = (data.measurementId ?? data.measurement_id ?? data.measurementsId) as string | undefined;

    const payload: Record<string, unknown> = {
      customer_id: userId,
      tailor_id: tailorId,
      total_amount: totalAmount,
      additional_notes: additionalNotes,
      item_name: itemName ?? null,
      design_images: Array.isArray(designImages) ? designImages : [],
      measurements: measurements && typeof measurements === "object" ? measurements : {},
      delivery_date: deliveryDate,
      status: "pending",
    };

    if (serviceId && typeof serviceId === "string" && serviceId.trim()) payload.service_id = serviceId;
    if (designId && typeof designId === "string" && designId.trim()) payload.design_id = designId;
    if (measurementId && typeof measurementId === "string" && measurementId.trim()) payload.measurement_id = measurementId;

    const { data: created, error } = await client
      .from("orders")
      .insert(payload)
      .select("id, customer_id, tailor_id, item_name, total_amount, status, delivery_date, additional_notes, design_images, measurements, created_at, updated_at, customer:profiles!customer_id(id, full_name, phone, avatar_url, address), tailor:tailors!tailor_id(id, user_id, shop_name, rating, review_count, city, address, banner_url, verified, profile:profiles(id, full_name, phone, avatar_url))")
      .single();

    if (error) throw new AppError(error.message, 400);

    // Notify tailor and customer of new order placement
    try {
      const tailorObj: any = (created as any)?.tailor;
      const custObj: any = (created as any)?.customer;
      const tailorUserId = Array.isArray(tailorObj) ? tailorObj[0]?.user_id : tailorObj?.user_id;
      const customerName = (Array.isArray(custObj) ? custObj[0]?.full_name : custObj?.full_name) || "A customer";
      const itemName = (created as any)?.item_name || "Custom Stitching";
      const orderCode = created?.id ? created.id.slice(0, 8).toUpperCase() : "";

      // 1. Notify the tailor about the new incoming order
      if (tailorUserId) {
        await notificationsService.createNotification({
          userId: tailorUserId,
          title: "New Order Received 🧵",
          message: `${customerName} placed an order for ${itemName} (#${orderCode}).`,
          type: "order",
          data: {
            orderId: created.id,
            customerId: userId,
            totalAmount: created.total_amount,
          },
        });
      }

      // 2. Notify the customer with order confirmation
      if (userId) {
        const tailorShop = (Array.isArray(tailorObj) ? tailorObj[0]?.shop_name : tailorObj?.shop_name) || "the tailor";
        await notificationsService.createNotification({
          userId,
          title: "Order Placed Successfully ✨",
          message: `Your order for ${itemName} (#${orderCode}) was placed with ${tailorShop}.`,
          type: "order",
          data: {
            orderId: created.id,
            tailorId: created.tailor_id,
          },
        });
      }
    } catch (notifErr: any) {
      console.warn("[Order Creation Notification Warning]:", notifErr?.message || notifErr);
    }

    return formatOrderRecord(created);
  },

  async updateOrderStatus(orderId: string, _userId: string | undefined, _userRole: string | undefined, status: string) {
    const client = getDbClient();
    const { data: updated, error } = await client
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select("id, customer_id, tailor_id, item_name, total_amount, status, delivery_date, additional_notes, design_images, measurements, created_at, updated_at, customer:profiles!customer_id(id, full_name, phone, avatar_url, address), tailor:tailors!tailor_id(id, user_id, shop_name, rating, review_count, city, address, banner_url, verified, profile:profiles(id, full_name, phone, avatar_url))")
      .single();

    if (error) throw new AppError(error.message, 400);

    try {
      if (updated?.customer_id) {
        const orderCode = orderId.slice(0, 8).toUpperCase();
        const tailorObj: any = (updated as any)?.tailor;
        const tailorShop = (Array.isArray(tailorObj) ? tailorObj[0]?.shop_name : tailorObj?.shop_name) || "Your tailor";
        const formattedStatus = status.replace(/_/g, " ").toUpperCase();

        await notificationsService.createNotification({
          userId: updated.customer_id,
          title: `Order Update: ${formattedStatus}`,
          message: `${tailorShop} updated order #${orderCode} status to "${status}".`,
          type: "order",
          data: {
            orderId,
            status,
          },
        });
      }
    } catch (notifErr: any) {
      console.warn("[Order Status Notification Warning]:", notifErr?.message || notifErr);
    }

    return formatOrderRecord(updated);
  },

  async cancelOrder(orderId: string, userId: string | undefined, userRole: string | undefined) {
    const client = getDbClient();
    const { data: updated, error } = await client
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .select("id, customer_id, tailor_id, item_name, total_amount, status, delivery_date, additional_notes, design_images, measurements, created_at, updated_at, customer:profiles!customer_id(id, full_name, phone, avatar_url, address), tailor:tailors!tailor_id(id, user_id, shop_name, rating, review_count, city, address, banner_url, verified, profile:profiles(id, full_name, phone, avatar_url))")
      .single();

    if (error) throw new AppError(error.message, 400);

    try {
      const orderCode = orderId.slice(0, 8).toUpperCase();
      // If customer cancelled, notify tailor. If tailor cancelled, notify customer.
      const tailorObj: any = (updated as any)?.tailor;
      const tailorUserId = Array.isArray(tailorObj) ? tailorObj[0]?.user_id : tailorObj?.user_id;
      const notifyUserId = userId === updated?.customer_id ? tailorUserId : updated?.customer_id;
      if (notifyUserId) {
        await notificationsService.createNotification({
          userId: notifyUserId,
          title: "Order Cancelled",
          message: `Order #${orderCode} has been cancelled.`,
          type: "order",
          data: {
            orderId,
            status: "cancelled",
          },
        });
      }
    } catch (notifErr: any) {
      console.warn("[Order Cancel Notification Warning]:", notifErr?.message || notifErr);
    }

    return formatOrderRecord(updated);
  },


  async getOrderInvoice(orderId: string, userId: string | undefined, userRole: string | undefined) {
    const order = await this.getOrderById(orderId, userId, userRole);
    return {
      invoiceId: `INV-${orderId.substring(0, 8).toUpperCase()}`,
      order,
      generatedAt: new Date().toISOString(),
    };
  },

  async getOrderTracking(orderId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { data, error } = await client
      .from("order_tracking")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) throw new AppError(error.message, 400);
    return data ?? [];
  },

  async addOrderTracking(orderId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("order_tracking")
      .insert({
        ...mapped,
        order_id: orderId,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updateOrderTracking(trackingId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: updated, error } = await client
      .from("order_tracking")
      .update(mapped)
      .eq("id", trackingId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async getOrderParties(orderId: string, userId: string | undefined, userRole: string | undefined) {
    const order = await this.getOrderById(orderId, userId, userRole);
    if (!order) throw new AppError("Order not found", 404);

    return {
      orderId: order.id,
      customer: order.customer,
      tailor: order.tailor,
    };
  },
};

