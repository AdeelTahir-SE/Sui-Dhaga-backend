# Sui Dhaga: Backend Integration Gaps

Comparison of the live backend OpenAPI spec (`https://sui-dhaga-backend.vercel.app/api-docs/`) against the frontend pages and services. Below are the missing endpoints and integration gaps needed for full end-to-end backend coverage.

File paths are relative to the frontend repo root (`Sui-Dhaga-website/`).

---

## 1. AI Design Studio & Saved Designs

The live backend only exposes `GET /designs`, `GET /designs/{designId}`, and `POST /uploads/image`.

| Endpoint | Purpose | Frontend file | Current behavior |
|---|---|---|---|
| `POST /designs` | Create/save a new AI design record | `src/lib/design-studio-data.ts` | Saves new designs to `localStorage` |
| `PATCH /designs/{designId}` | Persist editor changes (title, fabric, color palette, favorite/trash flags) | `src/components/design-studio/studio-editor-page.tsx`, `src/components/design-studio/studio-my-designs-page.tsx` | `localStorage` only |
| `DELETE /designs/{designId}` | Permanently delete designs or remove from saved list | `src/components/customer/customer-saved-designs-page.tsx` | `localStorage` only |
| `POST /designs/generate` and `POST /designs/chat` | Real AI image/concept generation for Text-to-Design, Image-to-Design, Sketch-to-Design, and Studio Chat | `generateDesignFromPromptApi` in `src/lib/design-studio-data.ts` (L1021-L1066) | Picks placeholder assets client-side |
| `GET /designs/templates` | Curated design templates catalog | `src/components/design-studio/studio-templates-page.tsx` | Falls back to static `initialTemplates` + community posts |
| `GET /designs/{designId}/tech-pack` (or a PDF export/share endpoint) | Backend-generated tech pack and tailor sharing | `src/components/design-studio/studio-export-page.tsx` | Not backed by the API |

---

## 2. Tailors Public & Tailor Portal (`/tailors/*`, `/tailor/*`)

The live backend has: tailor directory, single tailor profile create/update, `POST` service, availability `GET/POST/PATCH/DELETE`, reviews `GET`, and banner `POST`.

| Endpoint | Purpose | Frontend file | Current behavior |
|---|---|---|---|
| `PATCH /tailors/{tailorId}/services/{serviceId}` | Edit an existing service | `src/components/tailors/tailor-services-page.tsx` | Only `addService` hits the API; edits update `localStorage` only |
| `DELETE /tailors/{tailorId}/services/{serviceId}` | Delete an existing service | `src/components/tailors/tailor-services-page.tsx` | `localStorage` only |
| `POST /reviews/{reviewId}/reply` (or `/tailors/{tailorId}/reviews/{reviewId}/reply`) | Persist tailor replies to customer reviews | `src/components/tailors/tailor-reviews-page.tsx` | Not persisted |
| `GET /tailors/payouts` and `POST /tailors/payouts` (plus payout bank/wallet settings) | Payout history and withdrawal requests | `src/components/tailors/tailor-payouts-page.tsx`, `src/components/tailors/tailor-earnings-page.tsx` | `localStorage` only |
| `PUT /tailors/{tailorId}/availability/blocked-dates` | Persist blocked calendar dates | `src/components/tailors/tailor-availability-page.tsx` | Not persisted |
| `POST /tailors/{tailorId}/gallery` and `DELETE /tailors/{tailorId}/gallery` | Tailor portfolio images beyond the shop banner | n/a | No endpoint |

---

## 3. Customer Account, Checkout, Payments & Wishlist

The live backend currently only has `/users/me`, `/orders`, `/appointments`, `/measurements`, `/notifications`, `/conversations`, and `POST /payments/webhook`.

| Endpoint | Purpose | Frontend file | Current behavior |
|---|---|---|---|
| `GET / POST / PATCH / DELETE /addresses` | Saved delivery addresses | `src/components/customer/customer-addresses-page.tsx`, `src/components/common/checkout-page.tsx` | `localStorage` |
| `GET / POST / PATCH / DELETE /payment-methods` | Saved cards and mobile wallets (JazzCash / EasyPaisa / SadaPay) | `src/components/customer/customer-payments-page.tsx` | Local only |
| `GET /payments/transactions` | Customer payment transaction history | `src/components/common/checkout-page.tsx` | Local only |
| `POST /payments/checkout` | Payment gateway initiation (Stripe / JazzCash / EasyPaisa) | `src/components/common/checkout-page.tsx` | Not implemented |
| `POST /coupons/validate` | Promo-code validation | `src/components/common/checkout-page.tsx` | Not implemented |
| `GET /subscriptions/plans` and `POST /subscriptions/checkout` | Plan billing and upgrades | `src/components/common/pricing-page.tsx` | Not implemented |
| `GET / POST / DELETE /wishlist/{tailorId}` | Sync saved/wishlisted tailors | `src/components/customer/customer-wishlist-page.tsx`, `toggleWishlistApi` in `src/lib/tailors-data.ts` | Local only |
| `POST /auth/change-password` | Authenticated password change (requires current password) | `src/components/customer/customer-settings-page.tsx` | Not implemented |

---

## 4. Community Pages (`/community/*`)

The live backend has `GET/POST /community/posts`, `GET/PATCH/DELETE /community/posts/{postId}`, `/like`, `/save`, and `/comments`.

| Endpoint | Purpose | Frontend file | Current behavior |
|---|---|---|---|
| `POST /users/{userId}/follow` and `DELETE /users/{userId}/follow` | Follow/unfollow creators | `src/components/community/community-feed-page.tsx`, `src/components/community/community-post-detail-page.tsx` | Local state only |
| `GET /community/following` | Following list and "Who to follow" suggestions | Same as above | Local state only |
| `GET /community/trending` | Trending feed | Community feed | Not implemented |
| Feed `tab` and `visibility` support | Backend filtering for `for-you`, `following`, `trending`, `latest` tabs, and saving `Public` / `Followers` / `Private` visibility | `src/components/community/community-create-post-page.tsx` | Not implemented |

**Frontend fix (no new endpoint needed):** `POST /community/posts/{postId}/comments` already exists on the backend. However, `community-feed-page.tsx` and `community-post-detail-page.tsx` currently append comments only in local state instead of calling `communityService.addComment` (`src/lib/api/community-service.ts`, L204-L210).

---

## 5. Admin Portal (`/admin/*`): Path Mismatch + Missing Endpoints

### Path mismatch (frontend fix)

The OpenAPI spec defines these existing routes:

- `/admin/dashboard/stats`
- `/admin/users` (plus `/block`, `/unblock`)
- `/admin/tailors` (plus `/verify`, `/reject`)
- `/admin/orders`
- `/admin/payments`
- `/admin/reports`
- `DELETE /admin/community/posts/{postId}`

However, `src/lib/api/admin-service.ts` calls `/api/admin/...`, which hits the Next.js mock route handlers instead of `/api/v1/admin/...`. The frontend base path needs to be corrected.

### Missing admin endpoints

- `GET /admin/dashboard/revenue`
- `GET /admin/dashboard/activities`
- `GET / POST / PATCH / DELETE /admin/users/{userId}`
- `GET /admin/tailors/{tailorId}`
- `PATCH /admin/tailors/{tailorId}` (featured-tailor toggle)
- `GET /admin/orders/{orderId}`
- `PATCH /admin/orders/{orderId}/status`
- `GET /admin/payments/payouts`
- `POST /admin/payments/payouts/{id}` (payout approval/rejection)
- `POST /admin/payments/refund`
- `GET /admin/disputes`
- `POST /admin/disputes/{id}/resolve`
- `GET /admin/reviews`
- `POST /admin/reviews/{id}/moderate`
- `GET / PUT /admin/cms`
- `GET / PUT /admin/settings`

---

## 6. Static / Content Pages

| Endpoint | Purpose | Frontend file | Notes |
|---|---|---|---|
| `POST /contact` | Support/contact form submission | `src/app/contact/page.tsx` | Required |
| `GET /fabrics` | Fabrics managed from the database | `/fabrics` page | Optional, only if content should be dynamic |
| `GET /blog` and `GET /blog/{slug}` | Blog managed from the database | `/blog` pages | Optional, only if content should be dynamic |
