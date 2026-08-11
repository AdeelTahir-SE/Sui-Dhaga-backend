export const APP_CONSTANTS = {
  API_VERSION: "v1",
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  ROLES: {
    CUSTOMER: "customer",
    TAILOR: "tailor",
    ADMIN: "admin",
  },
  ORDER_STATUSES: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  },
  TAILOR_VERIFICATION_STATUSES: {
    PENDING: "pending",
    VERIFIED: "verified",
    REJECTED: "rejected",
    SUSPENDED: "suspended",
  },
} as const;
