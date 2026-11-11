import { getDbClient } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingTableError } from "../../utils/supabase-error.js";

const FALLBACK_COUPONS: Array<{
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  is_active: boolean;
}> = [
  {
    code: "SUI10",
    description: "10% off your custom tailoring order",
    discount_type: "percentage",
    discount_value: 10,
    max_discount_amount: 2000,
    min_order_amount: 1000,
    is_active: true,
  },
  {
    code: "WELCOME500",
    description: "Flat PKR 500 off on orders above PKR 2,500",
    discount_type: "fixed",
    discount_value: 500,
    max_discount_amount: 500,
    min_order_amount: 2500,
    is_active: true,
  },
  {
    code: "BRIDAL15",
    description: "15% off luxury bridal stitching orders",
    discount_type: "percentage",
    discount_value: 15,
    max_discount_amount: 5000,
    min_order_amount: 15000,
    is_active: true,
  },
];

export interface ValidateCouponInput {
  code: string;
  orderAmount?: number;
  userId?: string;
}

export const couponsService = {
  async validateCoupon(input: ValidateCouponInput) {
    const cleanCode = String(input.code || "").trim().toUpperCase();
    if (!cleanCode) {
      throw new AppError("Coupon code is required", 400);
    }

    const orderAmount = Number(input.orderAmount ?? 0);
    const client = getDbClient();

    const { data, error } = await client
      .from("coupons")
      .select("*")
      .ilike("code", cleanCode)
      .maybeSingle();

    let coupon = data as any;
    if (error) {
      if (isMissingTableError(error)) {
        coupon = FALLBACK_COUPONS.find((c) => c.code === cleanCode) || null;
      } else {
        throw new AppError(error.message, 400);
      }
    }

    if (!coupon) {
      throw new AppError("Invalid or unknown coupon code", 404);
    }
    if (coupon.is_active === false) {
      throw new AppError("This coupon is no longer active", 400);
    }

    const now = Date.now();
    if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
      throw new AppError("This coupon is not active yet", 400);
    }
    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now) {
      throw new AppError("This coupon has expired", 400);
    }
    if (coupon.max_uses != null && Number(coupon.used_count ?? 0) >= Number(coupon.max_uses)) {
      throw new AppError("This coupon has reached its redemption limit", 400);
    }

    const minOrderAmount = Number(coupon.min_order_amount ?? 0);
    if (orderAmount > 0 && orderAmount < minOrderAmount) {
      throw new AppError(
        `Minimum order amount of PKR ${minOrderAmount} is required to apply ${cleanCode}`,
        400
      );
    }

    let discountAmount = 0;
    const discountValue = Number(coupon.discount_value ?? 0);
    if (coupon.discount_type === "percentage") {
      const rawDiscount = orderAmount > 0 ? (orderAmount * discountValue) / 100 : 0;
      const maxCap = coupon.max_discount_amount != null ? Number(coupon.max_discount_amount) : Infinity;
      discountAmount = Number(Math.min(rawDiscount, maxCap).toFixed(2));
    } else {
      discountAmount =
        orderAmount > 0 ? Number(Math.min(discountValue, orderAmount).toFixed(2)) : discountValue;
    }

    const finalAmount =
      orderAmount > 0 ? Math.max(0, Number((orderAmount - discountAmount).toFixed(2))) : 0;

    return {
      valid: true,
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discount_type,
      discountValue,
      maxDiscountAmount: coupon.max_discount_amount != null ? Number(coupon.max_discount_amount) : null,
      minOrderAmount,
      orderAmount,
      discountAmount,
      finalAmount,
    };
  },
};
