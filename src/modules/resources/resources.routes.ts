import { Router } from "express";
import { z } from "zod";
import { supabase } from "../../config/supabase.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginated, success } from "../../utils/api-response.js";

type Role = "customer" | "tailor" | "admin";
type Definition = {
  method: "get" | "post" | "patch" | "delete";
  path: string;
  table: string;
  roles?: Role[];
  public?: boolean;
};
const toExpress = (path: string) => path.replace(/\[([^\]]+)\]/g, ":$1");
const entries = (
  lines: string,
  table: string,
  roles?: Role[],
  public = false,
): Definition[] =>
  lines
    .trim()
    .split("\n")
    .map((line) => {
      const [method, path] = line.split(" ");
      return {
        method: method.toLowerCase() as Definition["method"],
        path: toExpress(path),
        table,
        roles,
        public,
      };
    });

const definitions: Definition[] = [
  ...entries(
    "get /users/me\npatch /users/me\npatch /users/me/avatar\ndelete /users/me\nget /users/[userId]",
    "profiles",
  ),
  ...entries(
    "get /tailors\nget /tailors/nearby\nget /tailors/map\nget /tailors/[tailorId]\nget /tailors/[tailorId]/services\nget /tailors/[tailorId]/availability\nget /tailors/[tailorId]/reviews",
    "tailors",
    undefined,
    true,
  ),
  ...entries(
    "post /tailors\npatch /tailors/[tailorId]\ndelete /tailors/[tailorId]\npost /tailors/[tailorId]/gallery\ndelete /tailors/[tailorId]/gallery/[imageId]\npost /tailors/[tailorId]/verify\npost /tailors/compare\npost /tailors/[tailorId]/services\npatch /tailors/[tailorId]/services/[serviceId]\ndelete /tailors/[tailorId]/services/[serviceId]\npost /tailors/[tailorId]/availability\npatch /availability/[slotId]\ndelete /availability/[slotId]",
    "tailors",
    ["tailor", "admin"],
  ),
  ...entries(
    "get /appointments\npost /appointments\nget /appointments/[appointmentId]\npatch /appointments/[appointmentId]/status\npatch /appointments/[appointmentId]/reschedule\ndelete /appointments/[appointmentId]",
    "appointments",
    ["customer", "tailor", "admin"],
  ),
  ...entries(
    "get /orders\npost /orders\nget /orders/[orderId]\npatch /orders/[orderId]/status\npost /orders/[orderId]/cancel\nget /orders/[orderId]/invoice\nget /orders/[orderId]/tracking\npost /orders/[orderId]/tracking\npatch /orders/[orderId]/tracking/[trackingId]",
    "orders",
    ["customer", "tailor", "admin"],
  ),
  ...entries(
    "get /conversations\npost /conversations\nget /conversations/[conversationId]\nget /conversations/[conversationId]/messages\npost /conversations/[conversationId]/messages\npatch /messages/[messageId]/read\npost /messages/[messageId]/attachments",
    "conversations",
  ),
  ...entries(
    "get /designs\nget /designs/[designId]\npost /designs/text-to-design\npost /designs/image-to-design\npost /designs/sketch-to-design\npost /designs/chat\npatch /designs/[designId]\ndelete /designs/[designId]\npost /designs/[designId]/duplicate\npost /designs/[designId]/share-with-tailor\nget /designs/[designId]/chat\npost /designs/[designId]/chat\npatch /designs/[designId]/colors\npatch /designs/[designId]/fabric\npatch /designs/[designId]/embroidery\npatch /designs/[designId]/measurements\npatch /designs/[designId]/notes\npost /designs/[designId]/export-pdf\nget /designs/[designId]/pdf\nget /exports",
    "designs",
    ["customer", "tailor", "admin"],
  ),
  ...entries(
    "get /measurements\npost /measurements\nget /measurements/[measurementId]\npatch /measurements/[measurementId]\ndelete /measurements/[measurementId]",
    "measurements",
    ["customer", "tailor", "admin"],
  ),
  ...entries(
    "get /community/posts\nget /community/posts/[postId]",
    "community_posts",
    undefined,
    true,
  ),
  ...entries(
    "post /community/posts\npatch /community/posts/[postId]\ndelete /community/posts/[postId]\npost /community/posts/[postId]/like\npost /community/posts/[postId]/save\nget /community/posts/[postId]/comments\npost /community/posts/[postId]/comments",
    "community_posts",
  ),
  ...entries(
    "get /fabrics\nget /fabrics/[fabricId]",
    "fabrics",
    undefined,
    true,
  ),
  ...entries(
    "post /fabrics\npatch /fabrics/[fabricId]\ndelete /fabrics/[fabricId]",
    "fabrics",
    ["admin"],
  ),
  ...entries(
    "post /orders/[orderId]/review\npatch /reviews/[reviewId]\ndelete /reviews/[reviewId]",
    "reviews",
  ),
  ...entries(
    "get /wishlist\npost /wishlist/tailors/[tailorId]\ndelete /wishlist/tailors/[tailorId]\npost /wishlist/designs/[designId]\ndelete /wishlist/designs/[designId]",
    "wishlists",
    ["customer"],
  ),
  ...entries(
    "post /payments/create-checkout\npost /payments/confirm\nget /payments/history\nget /payments/[paymentId]",
    "payments",
    ["customer", "admin"],
  ),
  ...entries("post /payments/webhook", "payments", undefined, true),
  ...entries(
    "get /notifications\npatch /notifications/[notificationId]/read\npatch /notifications/read-all\ndelete /notifications/[notificationId]",
    "notifications",
  ),
  ...entries(
    "post /uploads/image\npost /uploads/images\npost /uploads/file\ndelete /uploads/[fileId]",
    "uploads",
  ),
  ...entries(
    "get /admin/dashboard/stats\nget /admin/users\npatch /admin/users/[userId]/block\npatch /admin/users/[userId]/unblock\nget /admin/tailors\npatch /admin/tailors/[tailorId]/verify\npatch /admin/tailors/[tailorId]/reject\nget /admin/orders\nget /admin/payments\nget /admin/reports\ndelete /admin/community/posts/[postId]",
    "admin",
    ["admin"],
  ),
];

const idFrom = (params: Record<string, string>) =>
  Object.values(params).find((value) => /^[0-9a-f-]{16,}$/i.test(value));
export const resourceRoutes = Router();
for (const definition of definitions) {
  const middleware = definition.public
    ? []
    : [
        requireAuth,
        ...(definition.roles ? [requireRole(...definition.roles)] : []),
      ];
  resourceRoutes[definition.method](
    definition.path,
    ...middleware,
    ...(definition.method === "post" || definition.method === "patch"
      ? [validate(z.record(z.unknown()))]
      : []),
    asyncHandler(async (req, res) => {
      if (!supabase)
        throw new AppError("Database service is not configured", 503);
      const id = idFrom(req.params);
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      if (definition.method === "get") {
        let query = supabase
          .from("resources")
          .select("*", { count: "exact" })
          .eq("resource_type", definition.table);
        if (id) query = query.eq("id", id);
        if (!definition.public && req.userRole !== "admin")
          query = query.eq("owner_id", req.user!.id);
        const { data, error, count } = await query.range(
          (page - 1) * limit,
          page * limit - 1,
        );
        if (error) throw new AppError(error.message, 400);
        const records = (data ?? []).map((row) => ({
          id: row.id,
          ...row.data,
        }));
        return id
          ? success(res, records[0] ?? null, "Resource fetched successfully")
          : paginated(
              res,
              records,
              page,
              limit,
              count ?? 0,
              "Resources fetched successfully",
            );
      }
      if (definition.method === "delete") {
        let query = supabase
          .from("resources")
          .delete()
          .eq("id", id)
          .eq("resource_type", definition.table);
        if (req.userRole !== "admin")
          query = query.eq("owner_id", req.user!.id);
        const { error } = await query;
        if (error) throw new AppError(error.message, 400);
        return success(res, null, "Resource deleted successfully");
      }
      const payload = {
        ...req.body,
        ...(req.user ? { user_id: req.user.id } : {}),
      };
      let update = supabase
        .from("resources")
        .update({ data: payload })
        .eq("id", id)
        .eq("resource_type", definition.table);
      if (id && req.userRole !== "admin")
        update = update.eq("owner_id", req.user!.id);
      const query = id
        ? update.select().single()
        : supabase
            .from("resources")
            .insert({
              resource_type: definition.table,
              owner_id: req.user?.id ?? null,
              data: payload,
            })
            .select()
            .single();
      const { data, error } = await query;
      if (error) throw new AppError(error.message, 400);
      return success(
        res,
        data ? { id: data.id, ...data.data } : data,
        id ? "Resource updated successfully" : "Resource created successfully",
        id ? 200 : 201,
      );
    }),
  );
}
