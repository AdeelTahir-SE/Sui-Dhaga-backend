# API Documentation

Base Endpoint: `/api/v1`

For complete endpoint listing, request/response formats, and status codes, see [`agents/endpoints.md`](file:///d:/Projects/Sui-Dhaga-backend/agents/endpoints.md) and [`agents/api-guidelines.md`](file:///d:/Projects/Sui-Dhaga-backend/agents/api-guidelines.md).

## Quick Endpoints Overview
- **Auth**: `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/refresh-token`
- **Users**: `/users/me`, `/users/me/avatar`, `/users/:userId`
- **Tailors**: `/tailors`, `/tailors/nearby`, `/tailors/map`, `/tailors/:tailorId`
- **Orders**: `/orders`, `/orders/:orderId`, `/orders/:orderId/status`, `/orders/:orderId/tracking`
- **Designs**: `/designs`, `/designs/text-to-design`, `/designs/image-to-design`, `/designs/sketch-to-design`
- **Admin**: `/admin/dashboard/stats`, `/admin/users`, `/admin/tailors`, `/admin/orders`
