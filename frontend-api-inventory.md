# Sui Dhāga: Frontend API Call Inventory

Complete inventory of every feature and page in the Sui Dhāga website that sends HTTP requests or fetches data, with the exact endpoints, services, caching behavior, and fallback boundaries.

File paths are relative to the frontend repo root (`Sui-Dhaga-website/`). Backend endpoints are relative to the API base URL (`https://sui-dhaga-backend.vercel.app/api/v1` by default).

---

## Core Request & Cache Layer

| Module | File | Behavior |
|---|---|---|
| API Client | `src/lib/api/client.ts` | Routes `apiClient` requests to `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_BACKEND_URL`, defaulting to `https://sui-dhaga-backend.vercel.app/api/v1`. Sends Bearer JWT headers. |
| Persistent Cache | `src/lib/api/data-cache.ts` | In-memory + `localStorage` cache (30-minute TTL, in-flight request deduplication, mutation invalidation). Used across Tailors, AI Design Studio, and Community data adapters. |

---

## 1. Authentication & Session Management

**Login, Register, Forgot/Reset Password & Google OAuth**
`src/components/auth/auth-form-card.tsx` → `src/lib/api/auth-service.ts`

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/google-url`

**Logout**
Called from:

- `src/components/community/community-feed-page.tsx`
- `src/components/customer/customer-dashboard-page.tsx`
- `src/components/customer/customer-sidebar.tsx`
- `src/components/messages/messages-overview-page.tsx`
- `src/components/messages/messages-chat-room-page.tsx`

Endpoint: `POST /auth/logout`

---

## 2. Public Tailor Discovery & Booking

**Tailor Marketplace, Map View, Compare & Public Profile**
Files: `src/components/tailors/tailors-marketplace-page.tsx`, `tailors-map-view-page.tsx`, `tailors-compare-page.tsx`, `tailor-profile-page.tsx` → `src/lib/tailors-data.ts` / `src/lib/api/tailor-service.ts`

- `GET /tailors` (paginated/filtered list; cached)
- `GET /tailors/{tailorId}` (single tailor details on Compare & Profile; cached)

**Appointment Booking Flow**
Files: `src/components/booking/booking-appointment-page.tsx` → `src/lib/booking-data.ts`

- `GET /tailors/{tailorId}` (tailor details & services)
- `GET /tailors/{tailorId}/availability` (available date/time slots)
- `POST /appointments` (create booking)

---

## 3. Tailor Onboarding & Tailor Portal

All tailor portal components are in `src/components/tailors/`.

| Page | File | Endpoints |
|---|---|---|
| Become a Tailor & Onboarding | `become-a-tailor-page.tsx`, `tailor-onboarding-page.tsx` | `POST /tailors`. Onboarding also calls `adminService.tailors.getTailors()` (see Admin Panel). |
| Dashboard | `tailor-dashboard-page.tsx` → `src/lib/tailor-dashboard-data.ts` | `GET /users/me`, `GET /orders`, `GET /appointments`, `GET /conversations` |
| Orders & Order Detail | `tailor-orders-page.tsx`, `tailor-order-detail-page.tsx` | `GET /orders`, `PATCH /orders/{orderId}/status` |
| Appointments | `tailor-appointments-page.tsx` | `GET /appointments`, `PATCH /appointments/{appointmentId}/status` (`confirmed` / `cancelled`) |
| Services Catalog | `tailor-services-page.tsx` | `GET /users/me`, `GET /tailors/{tailorId}`, `POST /tailors/{tailorId}/services` |
| Availability | `tailor-availability-page.tsx` | `GET /users/me`, `GET /tailors/{tailorId}/availability`, `POST /tailors/{tailorId}/availability` |
| Business Profile | `tailor-business-profile-page.tsx` | `GET /users/me`, `GET /tailors/{tailorId}`, `PATCH /users/me` |
| Reviews | `tailor-reviews-page.tsx` | `GET /users/me`, `GET /tailors/{tailorId}/reviews` |
| Earnings | `tailor-earnings-page.tsx` | `GET /orders` |
| Messages | `tailor-messages-page.tsx` | `GET /conversations`, `POST /conversations/{conversationId}/messages` |

---

## 4. Customer Portal & Checkout

| Page | File | Endpoints |
|---|---|---|
| Dashboard | `src/components/customer/customer-dashboard-page.tsx` → `src/lib/customer-dashboard-data.ts` | `GET /users/me` (profile); `GET /orders`, `GET /appointments`, `GET /designs`, `GET /measurements` (stats + recent/upcoming/saved lists); `GET /tailors` (recommended outfits) |
| Orders & Order Detail | `src/components/customer/customer-orders-page.tsx`, `order-detail-page.tsx` | `GET /orders`, `GET /orders/{orderId}` |
| Appointments & Appointment Detail | `src/components/customer/customer-appointments-page.tsx`, `appointment-detail-page.tsx` | `GET /appointments`, `GET /appointments/{appointmentId}`, `PATCH /appointments/{appointmentId}/reschedule`, `DELETE /appointments/{appointmentId}` |
| Measurements & Add Measurement | `src/components/customer/customer-measurements-page.tsx`, `add-measurement-page.tsx` | `GET /measurements`, `POST /measurements`, `PATCH /measurements/{measurementId}`, `DELETE /measurements/{measurementId}` |
| Saved Designs | `src/components/customer/customer-saved-designs-page.tsx` → `src/lib/saved-designs-data.ts` | `GET /designs` |
| Addresses | `src/components/customer/customer-addresses-page.tsx` | `GET /users/me`, `PATCH /users/me` |
| Settings | `src/components/customer/customer-settings-page.tsx` | `GET /users/me`, `PATCH /users/me`, `POST /auth/reset-password` |
| Checkout | `src/components/common/checkout-page.tsx` | `POST /orders` (via `orderService.createOrder`). Also reads/stores user details via session/local storage. |

---

## 5. AI Design Studio

All design studio fetch wrappers use `src/lib/api/data-cache.ts` plus fallbacks in `src/lib/design-studio-data.ts`. Components are in `src/components/design-studio/`.

| Page | File | Endpoints |
|---|---|---|
| Studio Home | `studio-home-page.tsx` | `GET /designs` (recent designs), `GET /community/posts` (AI suggestions) |
| My Designs | `studio-my-designs-page.tsx` | `GET /designs` |
| Templates | `studio-templates-page.tsx` | `GET /community/posts` |
| Design Editor | `studio-editor-page.tsx` | `GET /designs`, `GET /designs/{designId}` |
| Export / Tech Pack | `studio-export-page.tsx` | `GET /designs`, `GET /designs/{designId}`, `GET /measurements` |
| Image-to-Design & Sketch-to-Design | `studio-image-to-design-page.tsx`, `studio-sketch-to-design-page.tsx` | `GET /designs`, `POST /uploads/image` |
| Text-to-Design, Studio Chat & Studio Tool | `studio-text-to-design-page.tsx`, `studio-chat-page.tsx`, `studio-tool-page.tsx` | `GET /designs` |

---

## 6. Community

Components are in `src/components/community/`.

| Page | File | Endpoints |
|---|---|---|
| Feed | `community-feed-page.tsx` → `src/lib/community-data.ts` | `GET /community/posts` (cached), `POST /community/posts`, `POST /community/posts/{postId}/like`, `POST /community/posts/{postId}/save` |
| Post Detail | `community-post-detail-page.tsx` | `GET /community/posts/{postId}` (cached), `POST /community/posts/{postId}/like`, `POST /community/posts/{postId}/save` |
| Create Post | `community-create-post-page.tsx` | `POST /community/posts` |

---

## 7. Direct Messaging & Notifications

**Messages Overview & Chat Room**
Files: `src/components/messages/messages-overview-page.tsx`, `messages-chat-room-page.tsx` → `src/lib/messages-data.ts`

- `GET /conversations`
- `GET /conversations/{conversationId}/messages`
- `POST /conversations/{conversationId}/messages`

**Notifications Center**
Files: `src/components/notifications/notifications-page.tsx` → `src/lib/api/notification-service.ts`

- `GET /notifications`
- `POST /notifications/read-all`
- `PATCH /notifications/{notificationId}/read`
- `DELETE /notifications/{notificationId}`

---

## 8. App Version & Android APK Download

**Server pages and Next.js API route**
Files: `src/app/download/page.tsx`, `src/app/download-app/page.tsx`, `src/app/sun-drop/page.tsx`, and the API route `src/app/api/app-version/route.ts` → `src/lib/app-version.ts`

- `GET /app-version/latest?platform=android&clientVersion=1` (server-side 60s revalidation, GitHub APK fallback)

**Client APK download component**
File: `src/components/download/apk-download-page.tsx`

- Calls the internal `GET /api/app-version`, then falls back directly to `GET /app-version/latest`.

---

## 9. Admin Panel

All admin calls go through `src/lib/api/admin-service.ts`, which **only sends HTTP requests when `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_BACKEND_URL` is explicitly set** (`IS_BACKEND_CONFIGURED`). Otherwise it uses the in-memory mock store.

When configured, `adminService` sends requests to `/api/admin/...` relative to `API_BASE_URL`. This does not match the backend's `/admin/...` routes under `/api/v1` (see the separate backend gaps document).

Components are in `src/components/admin/`.

| Page | File | Endpoints |
|---|---|---|
| Dashboard | `admin-dashboard-page.tsx` | `/api/admin/dashboard/stats`, `/revenue`, `/activities` |
| Users | `admin-users-page.tsx` | `/api/admin/users`, `/api/admin/users/{id}` (`GET`, `PATCH`, `DELETE`) |
| Tailors | `admin-tailors-page.tsx` | `/api/admin/tailors`, `/api/admin/tailors/{id}/verify` |
| Orders | `admin-orders-page.tsx` | `/api/admin/orders`, `/api/admin/orders/{id}/status` |
| Payments & Payouts | `admin-payments-page.tsx` | `/api/admin/payments/transactions`, `/payouts`, `/refund` |
| Disputes | `admin-disputes-page.tsx` | `/api/admin/disputes`, `/api/admin/disputes/{id}/resolve` |
| Reviews | `admin-reviews-page.tsx` | `/api/admin/reviews`, `/api/admin/reviews/{id}/moderate` |
| CMS & Platform Settings | `admin-cms-page.tsx`, `admin-settings-page.tsx` | `/api/admin/cms`, `/api/admin/settings` |

---

## Pages Currently Using Static / LocalStorage Data (No Backend Requests)

These pages do **not** currently fire API requests:

- **Customer Payments** (`src/components/customer/customer-payments-page.tsx`) and **Customer Wishlist** (`customer-wishlist-page.tsx`): `localStorage` only.
- **Tailor Payouts** (`src/components/tailors/tailor-payouts-page.tsx`): `localStorage` only.
- **Tailor Settings** (`tailor-settings-page.tsx`): local React state.
- **Admin Reports** (`src/components/admin/admin-reports-page.tsx`): no `adminService` call wired yet.
- **Navbar Quick Search** (`src/components/common/site-shell.tsx`) and static informational pages: `/`, `/about`, `/blog`, `/contact`, `/fabrics`, `/faqs`, `/how-it-works`, `/pricing`, `/privacy-policy`, `/refund-policy`, `/terms-and-conditions`.

### Service methods defined but not yet called by any UI page

Defined in `src/lib/api/` or data adapters, but unused by the UI:

- `reviewService.submitOrderReview`
- `submitTailorReviewApi`
- `tailorService.getNearbyTailors`
- `tailorService.getMapTailors`
- `tailorService.uploadBanner`
- `tailorService.updateAvailabilitySlot`
- `tailorService.deleteAvailabilitySlot`
- `userService.uploadAvatar`
- `userService.deleteMe`
- `communityService.getComments`
- `communityService.addComment`
- `notificationService.getUnreadCount`
- `notificationService.registerPushToken`
