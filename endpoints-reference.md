# Sui Dhāga: Complete API Endpoints Reference Manual

> **Base URL**: `/api/v1`  
> **Admin Alias Rewrite**: All requests incoming to `/api/admin/*`, `/api/v1/api/admin/*`, or `/admin/*` are automatically rewritten by backend middleware to `/api/v1/admin/*`.  
> **Global Authentication**: Bearer JWT tokens in the `Authorization: Bearer <token>` header.  
> **Standard Response Format**:
> ```json
> {
>   "success": true,
>   "message": "Human readable message",
>   "data": { ... } // or array of records
> }
> ```

---

## Table of Contents

1. [Authentication & Session Management (`/auth`)](#1-authentication--session-management-auth)
2. [User Profiles, Avatars & Moderation (`/users`)](#2-user-profiles-avatars--moderation-users)
3. [Public Tailor Discovery & Geolocation (`/tailors`)](#3-public-tailor-discovery--geolocation-tailors)
4. [Tailor Portal, Services, Availability & Payouts (`/tailors`, `/availability`)](#4-tailor-portal-services-availability--payouts)
5. [Appointments Booking Lifecycle (`/appointments`)](#5-appointments-booking-lifecycle-appointments)
6. [Custom Tailoring Orders, Tracking & Invoices (`/orders`)](#6-custom-tailoring-orders-tracking--invoices-orders)
7. [Customer Body Measurements (`/measurements`)](#7-customer-body-measurements-measurements)
8. [AI Design Studio & Export Studio (`/designs`, `/exports`)](#8-ai-design-studio--export-studio-designs-exports)
9. [Storage, File Uploads & Media Proxy (`/uploads`, `/media`)](#9-storage-file-uploads--media-proxy-uploads-media)
10. [Customer Saved Delivery Addresses (`/addresses`)](#10-customer-saved-delivery-addresses-addresses)
11. [Payment Methods & Tokenized Cards (`/payment-methods`)](#11-payment-methods--tokenized-cards-payment-methods)
12. [Payments, Transactions & Checkout (`/payments`)](#12-payments-transactions--checkout-payments)
13. [Coupons & Promotional Discounts (`/coupons`)](#13-coupons--promotional-discounts-coupons)
14. [Customer Wishlist (`/wishlist`)](#14-customer-wishlist-wishlist)
15. [Subscriptions & Platform Billing (`/subscriptions`)](#15-subscriptions--platform-billing-subscriptions)
16. [Tailor & Order Reviews (`/reviews`, `/tailors/:tailorId/reviews`, `/orders/:orderId/review`)](#16-tailor--order-reviews)
17. [Direct Messaging & Conversations (`/conversations`, `/messages`)](#17-direct-messaging--conversations)
18. [Notification Center & Push Tokens (`/notifications`)](#18-notification-center--push-tokens-notifications)
19. [Community Fashion Showcase & Social Feed (`/community`)](#19-community-fashion-showcase--social-feed-community)
20. [Mobile App Versioning & APK Download (`/app-version`)](#20-mobile-app-versioning--apk-download-app-version)
21. [Admin Operations, Disputes & Platform Settings (`/admin`)](#21-admin-operations-disputes--platform-settings-admin)
22. [Content Encyclopedia, Blogs & Inquiries (`/cms`, `/contact`, `/fabrics`, `/blog`)](#22-content-encyclopedia-blogs--inquiries)

---

## 1. Authentication & Session Management (`/auth`)

Handles customer and tailor account registrations, JWT login, token refreshes, password resets, and Google OAuth redirects.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Registers a new account. Accepts `email`, `password`, `name`/`fullName`, `phone`, `role` (`customer` or `tailor`), and `redirectTo`. Automatically sends Supabase verification email or bridges unconfirmed email resend if existing. |
| `POST` | `/auth/resend-confirmation` | Public | Resends the signup confirmation email to an unconfirmed email address. Returns 400 if already confirmed. |
| `POST` | `/auth/login` | Public | Authenticates via email and password. Returns access token, refresh token, user profile, and detected role. Returns `403` if email is unconfirmed. |
| `POST` | `/auth/logout` | Bearer (`Any`) | Invalidates user session tokens and clears server-side authentication state. |
| `GET` | `/auth/me` | Bearer (`Any`) | Returns authenticated user token identity, profile details, and role metadata. |
| `GET` | `/auth/verify-email` | Public | Helper verification endpoint checking confirmation status and handling email redirect bridges. |
| `POST` | `/auth/refresh-token` | Public | Exchanges a valid `refreshToken` for a fresh session access token without re-entering credentials. |
| `POST` | `/auth/forgot-password` | Public | Triggers a password recovery email containing an OTP code or reset token. |
| `POST` | `/auth/reset-password` | Optional / Bearer | Completes password reset using either an authenticated user session, email recovery OTP, or admin recovery token. Accepts `password` and `token`/`otp`. |
| `POST` | `/auth/google` | Public | Directly exchanges Google OAuth ID token for Supabase session. Returns access token and user profile. |
| `GET` | `/auth/google-url` | Public | Generates Google OAuth consent URL configured with callback redirects. Accepts optional `redirectTo` query parameter. |
| `GET` | `/auth/google/callback` | Public | HTML bridge handler for web and Android OAuth and confirmation token redirects, executing token parsing and client forwarding. |
| `POST` | `/auth/complete-profile` | Bearer (`Any`) | Enriches user metadata and creates a `profiles` entry for newly onboarded OAuth accounts. Accepts `role`, `phone`, and `address`. |
| `POST` | `/auth/change-password` | Bearer (`Any`) | Secure password update for logged-in users. Verifies `currentPassword` before committing `newPassword`. |

---

## 2. User Profiles, Avatars & Moderation (`/users`)

Manages user identity, personal information, avatar uploads/removals, account deletion, user blocking, and follower relations.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/users/me` | Bearer (`Any`) | Retrieves full authenticated user profile, preferences, address summary, and linked tailor data (if applicable). |
| `PATCH` | `/users/me` | Bearer (`Any`) | Partially updates current user profile fields (`fullName`, `phone`, `city`, `bio`, `avatarUrl`, `gender`, etc.). |
| `PUT` | `/users/me` | Bearer (`Any`) | Replaces/updates current user profile fields with full validation. |
| `DELETE` | `/users/me` | Bearer (`Any`) | Permanently deletes user account, clears profile data, purges Redis/in-memory caches, and deletes user from Supabase Auth. |
| `POST` | `/users/me/avatar` | Bearer (`Any`) | Uploads new profile avatar image. Accepts multipart form-data under field `file`, `image`, `avatar`, or `profileImage`, or base64 JSON body. Purges prior avatar from storage. |
| `PUT` | `/users/me/avatar` | Bearer (`Any`) | Replaces profile avatar with multipart upload or base64 data URI payload. |
| `PATCH` | `/users/me/avatar` | Bearer (`Any`) | Updates user avatar URL or media asset link. |
| `DELETE` | `/users/me/avatar` | Bearer (`Any`) | Removes existing avatar photo from storage and resets `avatar_url` in database profile to null. |
| `GET` | `/users/blocked` | Bearer (`Any`) | Retrieves list of all user accounts blocked by the current user. |
| `POST` | `/users/report` | Bearer (`Any`) | Submits a safety violation report against another user, post, or tailor. Accepts `reportedUserId`, `reason`, `details`. |
| `POST` | `/users/block` | Bearer (`Any`) | Blocks target user (`targetUserId`), preventing direct messages, order interactions, and community feed visibility. |
| `POST` | `/users/unblock` | Bearer (`Any`) | Unblocks previously blocked user (`targetUserId`). |
| `GET` | `/users/:userId/block-status` | Bearer (`Any`) | Checks whether the current user has blocked the target user, or has been blocked by them. |
| `GET` | `/users/:userId/follow-status` | Bearer (`Any`) | Returns whether the authenticated user currently follows the target user. |
| `POST` | `/users/:userId/follow` | Bearer (`Any`) | Follows target user or tailor. Rejects self-follow attempts. |
| `DELETE` | `/users/:userId/follow` | Bearer (`Any`) | Unfollows target user. |
| `GET` | `/users/:userId` | Bearer (`Any`) | Retrieves public profile card of any user or tailor by their unique UUID. |

---

## 3. Public Tailor Discovery & Geolocation (`/tailors`)

Public and customer-facing discovery endpoints for finding, filtering, comparing, and inspecting artisan tailors.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/tailors` | Public | Paginated tailor search and discovery. Supports query filters: `city`, `specialties`, `minRating`, `isVerified`, `search`, `page`, `limit`. |
| `POST` | `/tailors` | Bearer (`customer`, `tailor`, `admin`) | Creates/onboards a new tailor profile. Promotes caller's role to `tailor` in `profiles` table upon creation. Accepts `shopName`, `bio`, `city`, `address`, `specialties`, `yearsOfExperience`. |
| `GET` | `/tailors/nearby` | Public | Geolocation radius search returning tailors ordered by proximity to latitude/longitude coordinates (`lat`, `lng`, `radiusKm`). |
| `GET` | `/tailors/map` | Public | Lightweight map marker feed providing geolocation coordinates, shop names, and ratings for interactive map pins. |
| `GET` | `/tailors/compare` | Public | Compares multiple tailor profiles side-by-side using comma-delimited `ids` query param (e.g. `?ids=id1,id2,id3`). |
| `POST` | `/tailors/compare` | Public / Bearer | Compares multiple tailors via JSON body containing array `{ tailorIds: [...] }`. |
| `GET` | `/tailors/:tailorId` | Public | Retrieves detailed public profile of a tailor including services offered, gallery photos, average rating, and bio. |
| `PATCH` | `/tailors/:tailorId` | Bearer (`tailor`, `admin`) | Updates tailor shop details, experience, address, contact numbers, or specialty tags. Caller must own the profile or be an admin. |
| `DELETE` | `/tailors/:tailorId` | Bearer (`tailor`, `admin`) | Deletes or archives tailor shop profile and marks related services inactive. |
| `POST` | `/tailors/:tailorId/verify-request` | Bearer (`tailor`, `admin`) | Submits a tailor badge verification request along with CNIC and business registration documents. |

---

## 4. Tailor Portal, Services, Availability & Payouts (`/tailors`, `/availability`)

Dedicated management endpoints for tailors to administer shop services, working hours, blocked holiday dates, media galleries, revenue analytics, and bank payout requests.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/tailors/me` | Bearer (`tailor`) | Retrieves authenticated tailor's shop profile, verification status, and settings. |
| `GET` | `/tailors/earnings` | Bearer (`tailor`) | Returns comprehensive earnings analytics: total gross revenue, net payouts, pending escrow balance, and historical trends. |
| `GET` | `/tailors/payouts` | Bearer (`tailor`) | Lists tailor payout history and withdrawal transactions with status (`pending`, `completed`, `failed`). |
| `POST` | `/tailors/payouts` | Bearer (`tailor`) | Requests a withdrawal/payout to bank account or mobile wallet. Validates available balance and prevents over-withdrawal. |
| `GET` | `/tailors/payout-settings` | Bearer (`tailor`) | Returns tailor payout bank account details, IBAN, and JazzCash/Easypaisa account configuration. |
| `PUT` | `/tailors/payout-settings` | Bearer (`tailor`) | Updates tailor payout settings, bank account title, IBAN, or mobile wallet numbers. |
| `PATCH` | `/tailors/payout-settings` | Bearer (`tailor`) | Partially modifies payout settings and disbursement preferences. |
| `GET` | `/tailors/payouts/settings` | Bearer (`tailor`) | Secondary alias route returning payout settings. |
| `PUT` | `/tailors/payouts/settings` | Bearer (`tailor`) | Secondary alias route updating payout configuration. |
| `PATCH` | `/tailors/payouts/settings` | Bearer (`tailor`) | Secondary alias route partially patching payout configuration. |
| `GET` | `/tailors/:tailorId/services` | Public | Lists all active services (e.g., Bridal Kurta, 2-Piece Suit, Alterations) with pricing and estimated turnaround time. |
| `POST` | `/tailors/:tailorId/services` | Bearer (`tailor`, `admin`) | Adds a new service offering to tailor catalog (`name`, `description`, `basePrice`, `estimatedDays`, `category`). |
| `PUT` | `/tailors/services/:serviceId` | Bearer (`tailor`, `admin`) | Direct update of tailor service offering. Enforces tailor ownership. |
| `PATCH` | `/tailors/services/:serviceId` | Bearer (`tailor`, `admin`) | Partial patch of service pricing or delivery days. |
| `DELETE` | `/tailors/services/:serviceId` | Bearer (`tailor`, `admin`) | Deletes or archives tailor service offering. |
| `PUT` | `/tailors/:tailorId/services/:serviceId` | Bearer (`tailor`, `admin`) | Nested route update of tailor service. Enforces tailor ownership. |
| `PATCH` | `/tailors/:tailorId/services/:serviceId` | Bearer (`tailor`, `admin`) | Nested route partial update of tailor service. |
| `DELETE` | `/tailors/:tailorId/services/:serviceId` | Bearer (`tailor`, `admin`) | Nested route deletion of tailor service. |
| `GET` | `/tailors/:tailorId/availability/blocked-dates` | Public / Tailor | Retrieves list of dates when tailor shop is closed or unavailable for fittings. |
| `PUT` | `/tailors/:tailorId/availability/blocked-dates` | Bearer (`tailor`, `admin`) | Replaces blocked calendar dates with an array of ISO date strings `{ dates: [...] }`. |
| `GET` | `/tailors/:tailorId/availability` | Public | Retrieves weekly working hours schedules and bookable time slots. |
| `PUT` | `/tailors/:tailorId/availability` | Bearer (`tailor`, `admin`) | Overwrites tailor weekly recurring schedule (days of week, start time, end time). |
| `POST` | `/tailors/:tailorId/availability` | Bearer (`tailor`, `admin`) | Adds single bookable slot or shifts availability window. |
| `PATCH` | `/availability/:slotId` | Bearer (`tailor`, `admin`) | Updates specific slot status or time boundaries. |
| `DELETE` | `/availability/:slotId` | Bearer (`tailor`, `admin`) | Removes specific time slot. |
| `POST` | `/tailors/:tailorId/banner` | Bearer (`tailor`, `admin`) | Uploads and sets shop banner image via multipart form-data. |
| `GET` | `/tailors/:tailorId/gallery` | Public | Retrieves photos of tailor past work and garment portfolio. |
| `POST` | `/tailors/:tailorId/gallery` | Bearer (`tailor`, `admin`) | Uploads new showcase image to tailor portfolio. |
| `DELETE` | `/tailors/:tailorId/gallery` | Bearer (`tailor`, `admin`) | Clears all showcase gallery images from tailor portfolio. |
| `DELETE` | `/tailors/:tailorId/gallery/:imageId` | Bearer (`tailor`, `admin`) | Deletes single photo from tailor gallery portfolio. |

---

## 5. Appointments Booking Lifecycle (`/appointments`)

In-person measurement fittings, design consultations, and trial bookings between customers and tailors.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/appointments` | Bearer (`Any`) | Lists appointments for current user. Tailors see incoming client bookings; customers see their scheduled consultations. |
| `POST` | `/appointments` | Bearer (`customer`) | Books a new appointment with a tailor. Accepts `tailorId`, `appointmentDate`, `timeSlot`, `type` (`fitting` or `consultation`), `notes`. |
| `GET` | `/appointments/:appointmentId` | Bearer (`Any`) | Retrieves single appointment details, party profiles, and location info. |
| `DELETE` | `/appointments/:appointmentId` | Bearer (`Any`) | Cancels and deletes an upcoming appointment. |
| `PATCH` | `/appointments/:appointmentId/status` | Bearer (`Any`) | Updates appointment status (`confirmed`, `in_progress`, `completed`, `cancelled`, `declined`). |
| `PATCH` | `/appointments/:appointmentId/reschedule` | Bearer (`Any`) | Reschedules appointment date and time slot. |

---

## 6. Custom Tailoring Orders, Tracking & Invoices (`/orders`)

Core bespoke garment order lifecycle: contract creation, phase transitions, live parcel tracking, cancellation, and invoices.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/orders` | Bearer (`Any`) | Lists orders for authenticated user (customers see placed orders, tailors see assigned orders). Supports query filters: `status`, `page`, `limit`. |
| `GET` | `/orders/my` | Bearer (`customer`) | Shortcut route returning customer placed order history. |
| `POST` | `/orders` | Bearer (`customer`) | Creates a custom tailoring order. Accepts `tailorId`, `serviceId`, `measurementId`, `designId`, `deliveryAddressId`, `specialInstructions`, `price`. |
| `GET` | `/orders/:orderId` | Bearer (`Any`) | Retrieves complete order specification, timeline, items, milestone history, and payment status. |
| `GET` | `/orders/:orderId/parties` | Bearer (`Any`) | Returns profile summaries of customer, tailor, and delivery agent associated with the order. |
| `PATCH` | `/orders/:orderId/status` | Bearer (`tailor`, `admin`) | Advances order stage: `pending` -> `accepted` -> `fabric_received` -> `cutting` -> `stitching` -> `fitting` -> `shipped` -> `delivered`. |
| `POST` | `/orders/:orderId/cancel` | Bearer (`Any`) | Submits order cancellation request. Handles refund evaluation based on order progression stage. |
| `PATCH` | `/orders/:orderId/cancel` | Bearer (`Any`) | Secondary PATCH alias for order cancellation. |
| `GET` | `/orders/:orderId/invoice` | Bearer (`Any`) | Generates and returns structured billing invoice data, line items, taxes, coupon discounts, and payment breakdown. |
| `GET` | `/orders/:orderId/tracking` | Bearer (`Any`) | Returns parcel tracking history, courier carrier, tracking tracking number, and live delivery updates. |
| `POST` | `/orders/:orderId/tracking` | Bearer (`tailor`, `admin`) | Creates or updates tracking number, courier service (TCS, Leopard, Trax), and parcel status. |
| `PATCH` | `/orders/tracking/:trackingId` | Bearer (`tailor`, `admin`) | Updates milestone log for parcel in transit. |
| `GET` | `/orders/:orderId/review` | Bearer (`Any`) | Retrieves customer review for this order if submitted. |
| `POST` | `/orders/:orderId/review` | Bearer (`customer`) | Submits review and star rating (1-5) for completed order. |
| `POST` | `/orders/:orderId/dispute` | Bearer (`customer`, `tailor`) | Opens formal order dispute for admin intervention regarding fit issues, non-delivery, or fabric quality. |

---

## 7. Customer Body Measurements (`/measurements`)

Stores body measurement profiles (e.g. Shalwar Kameez, Sherwani, Kurti, Western Suit) for instant reuse during order checkout.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/measurements` | Bearer (`Any`) | Lists saved measurement profiles for current user. |
| `GET` | `/measurements/my` | Bearer (`customer`) | Shortcut route returning customer's saved measurement charts. |
| `POST` | `/measurements` | Bearer (`customer`) | Creates new measurement profile (`title`, `gender`, `unit` [`inches`/`cm`], `chest`, `waist`, `hips`, `inseam`, `shoulder`, `sleeve`, `neck`, `kameezLength`, `shalwarLength`, `notes`). |
| `GET` | `/measurements/:measurementId` | Bearer (`Any`) | Retrieves specific measurement profile with all sizing dimensions. |
| `PUT` | `/measurements/:measurementId` | Bearer (`customer`) | Full update/replacement of measurement dimensions. |
| `PATCH` | `/measurements/:measurementId` | Bearer (`customer`) | Partial patch of specific measurement dimensions. |
| `DELETE` | `/measurements/:measurementId` | Bearer (`customer`) | Deletes saved measurement profile. |

---

## 8. AI Design Studio & Export Studio (`/designs`, `/exports`)

Supports AI generation, fashion concept refinement, saved studio designs, design templates, and downloadable Tech Pack PDF sheets.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/designs` | Bearer (`Any`) | Lists customer saved studio designs. Supports query filters: `isFavorite=true`, `isTrashed=false`, `type`. |
| `POST` | `/designs` | Bearer (`Any`) | Saves new design record (`title`, `prompt`, `imageUrl`, `fabric`, `colors`, `embroidery`, `measurements`). |
| `GET` | `/designs/templates` | Public | Curated fashion design templates (Bridal Lehenga, Jamawar Sherwani, Raw Silk Anarkali, Bespoke Suits). |
| `POST` | `/designs/generate` | Bearer (`Any`) | Generates fashion concepts and prompt refinements using generative AI from prompts, occasion, and fabric choice. |
| `POST` | `/designs/chat` | Bearer (`Any`) | AI Studio styling assistant conversation endpoint recommending fabrics, color swatches, and silhouette advice. |
| `POST` | `/designs/text-to-design` | Bearer (`Any`) | Generates garment specifications and visual concepts from textual fashion descriptions. |
| `POST` | `/designs/image-to-design` | Bearer (`Any`) | Extracts design specs and color schemes from uploaded reference photos. |
| `POST` | `/designs/sketch-to-design` | Bearer (`Any`) | Converts hand-drawn sketches into tailored digital design concepts. |
| `GET` | `/designs/:designId` | Bearer (`Any`) | Retrieves single design with full color swatches, fabric textures, and chat history. |
| `PATCH` | `/designs/:designId` | Bearer (`Any`) | Updates design attributes, title, fabric, embroidery, notes, or toggles `isFavorite` and `isTrashed`. |
| `DELETE` | `/designs/:designId` | Bearer (`Any`) | Permanently deletes a design from the user's studio account. |
| `GET` | `/designs/:designId/tech-pack` | Bearer (`Any`) | Returns JSON technical specification sheet with color palettes, stitching specifications, and tailor instructions. Appending `?format=pdf` dynamically renders and returns a PDF 1.4 Tech Pack file. |
| `POST` | `/designs/:designId/duplicate` | Bearer (`Any`) | Duplicates an existing design or template into a fresh editable draft for the user. |
| `POST` | `/designs/:designId/share-with-tailor` | Bearer (`Any`) | Shares design tech pack directly with a tailor and initiates a consultation conversation. |
| `GET` | `/designs/:designId/chat` | Bearer (`Any`) | Retrieves contextual styling conversation history specific to this design. |
| `POST` | `/designs/:designId/chat` | Bearer (`Any`) | Sends styling follow-up prompt for this specific design project. |
| `PATCH` | `/designs/:designId/colors` | Bearer (`Any`) | Updates primary, secondary, and accent color palettes for the design. |
| `PATCH` | `/designs/:designId/fabric` | Bearer (`Any`) | Updates fabric type, texture, weight, and material selection. |
| `PATCH` | `/designs/:designId/embroidery` | Bearer (`Any`) | Updates embroidery placement, thread style (Zari, Tilla, Resham), and density. |
| `PATCH` | `/designs/:designId/measurements` | Bearer (`Any`) | Links or updates measurement dimensions attached to this design. |
| `PATCH` | `/designs/:designId/notes` | Bearer (`Any`) | Updates client styling and tailor execution notes. |
| `POST` | `/designs/:designId/export-pdf` | Bearer (`Any`) | Renders and uploads the PDF Tech Pack to storage, returning a persistent download URL. |
| `GET` | `/designs/:designId/pdf` | Bearer (`Any`) | Direct binary PDF export endpoint downloading the design Tech Pack. |
| `GET` | `/exports` | Bearer (`Any`) | Lists user's exported Tech Packs and documents with download links. |

---

## 9. Storage, File Uploads & Media Proxy (`/uploads`, `/media`)

Multi-format file upload handling (images, patterns, PDF docs) with CDN storage, size validations, and media proxying.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `POST` | `/uploads/image` | Bearer (`Any`) | Uploads single image file (multipart or base64 data URI) to Supabase storage, returning the public CDN URL. |
| `POST` | `/uploads/images` | Bearer (`Any`) | Batch image file upload (up to 5 images per request) returning array of public URLs. |
| `POST` | `/uploads/file` | Bearer (`Any`) | Uploads PDF documents, tech packs, or CNIC verification files with mime-type checking. |
| `DELETE` | `/uploads/:fileId` | Bearer (`Any`) | Removes an uploaded asset from storage. |
| `GET` | `/media/:bucket/*` | Public | Proxies and serves stored media files from protected Supabase storage buckets. |

---

## 10. Customer Saved Delivery Addresses (`/addresses`)

Manages client delivery and measurement fitting addresses.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/addresses` | Bearer (`Any`) | Retrieves all saved addresses for current user. |
| `GET` | `/addresses/:addressId` | Bearer (`Any`) | Retrieves single address details. |
| `POST` | `/addresses` | Bearer (`Any`) | Creates a new address record (`addressLine`, `city`, `postalCode`, `isDefault`, `phone`, `label`). |
| `PATCH` | `/addresses/:addressId` | Bearer (`Any`) | Partially updates address details or sets `isDefault: true`. |
| `PUT` | `/addresses/:addressId` | Bearer (`Any`) | Full update of address record. |
| `DELETE` | `/addresses/:addressId` | Bearer (`Any`) | Removes a saved address from the user profile. |

---

## 11. Payment Methods & Tokenized Cards (`/payment-methods`)

Card management safeguarding sensitive PAN/CVV: stores tokenized brand and last4 digits only.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/payment-methods` | Bearer (`Any`) | Lists user saved tokenized payment methods (Visa, Mastercard, PayPak, Mobile Wallets). |
| `POST` | `/payment-methods` | Bearer (`Any`) | Tokenizes and stores payment method. Strips raw PAN/CVV, recording only `brand`, `last4`, `expiryMonth`, `expiryYear`. |
| `PATCH` | `/payment-methods/:methodId` | Bearer (`Any`) | Updates card label or toggles default status (`isDefault: true`). |
| `PUT` | `/payment-methods/:methodId` | Bearer (`Any`) | Replaces/updates payment method settings. |
| `DELETE` | `/payment-methods/:methodId` | Bearer (`Any`) | Detaches and deletes saved payment method. |

---

## 12. Payments, Transactions & Checkout (`/payments`)

Stripe, JazzCash, Easypaisa payment processing, checkout sessions, and webhook processing.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/payments/transactions` | Bearer (`Any`) | Retrieves transaction history with filter by `status` and date range. |
| `GET` | `/payments/history` | Bearer (`Any`) | Alias route for retrieving user payment history. |
| `POST` | `/payments/checkout` | Bearer (`Any`) | Initiates checkout session for an order, applies active coupons, and generates payment gateway intent. |
| `POST` | `/payments/create-checkout` | Bearer (`Any`) | Alias route for creating checkout intent. |
| `POST` | `/payments/confirm` | Bearer (`Any`) | Confirms client payment intent completion and updates escrow state. |
| `POST` | `/payments/webhook` | Public | Gateway webhook receiver for asynchronous payment provider callbacks (Stripe, JazzCash, Easypaisa). |
| `GET` | `/payments/:paymentId` | Bearer (`Any`) | Retrieves single payment transaction status and receipt information. |

---

## 13. Coupons & Promotional Discounts (`/coupons`)

Discounts and promotional campaigns.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `POST` | `/coupons/validate` | Optional / Bearer | Validates coupon code against order total. Returns discount amount, discount type (`percentage` or `fixed`), and final price. |

---

## 14. Customer Wishlist (`/wishlist`)

Saved tailors and favorited fashion concepts.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/wishlist` | Bearer (`Any`) | Retrieves customer wishlist items including favorited tailor cards and saved designs. |
| `POST` | `/wishlist/tailors/:tailorId` | Bearer (`Any`) | Saves a tailor to the user's favorites list. |
| `DELETE` | `/wishlist/tailors/:tailorId` | Bearer (`Any`) | Removes a tailor from favorites list. |
| `POST` | `/wishlist/designs/:designId` | Bearer (`Any`) | Saves a studio design to wishlist. |
| `DELETE` | `/wishlist/designs/:designId` | Bearer (`Any`) | Removes a design from wishlist. |
| `GET` | `/wishlist/:tailorId` | Bearer (`Any`) | Checks if tailor is in user's wishlist. |
| `POST` | `/wishlist/:tailorId` | Bearer (`Any`) | Direct alias to add tailor to wishlist. |
| `DELETE` | `/wishlist/:tailorId` | Bearer (`Any`) | Direct alias to remove tailor from wishlist. |

---

## 15. Subscriptions & Platform Billing (`/subscriptions`)

Tailor premium tier membership plans (Basic, Pro, Elite Tailor) with enhanced search ranking and zero commission perks.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/subscriptions/plans` | Public | Lists available platform subscription tiers with pricing and benefit matrices. |
| `GET` | `/subscriptions/me` | Bearer (`Any`) | Retrieves authenticated tailor current subscription plan, billing cycle, and expiration. |
| `POST` | `/subscriptions/checkout` | Bearer (`Any`) | Initiates subscription checkout session. |
| `POST` | `/subscriptions/activate` | Bearer (`Any`) | Directly activates plan tier (`planId`) for tailor account. |
| `POST` | `/subscriptions/cancel` | Bearer (`Any`) | Cancels active subscription at the end of the billing period. |

---

## 16. Tailor & Order Reviews (`/reviews`, `/tailors/:tailorId/reviews`, `/orders/:orderId/review`)

Public ratings, feedback comments, tailor responses, and review moderation.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/tailors/:tailorId/reviews` | Public | Retrieves reviews for a tailor with customer profile summaries, star scores, and tailor replies. |
| `POST` | `/tailors/:tailorId/reviews` | Bearer (`customer`) | Directly posts customer review and rating (1-5) for a tailor without requiring prior order ID. Recalculates tailor rating average. |
| `POST` | `/tailors/:tailorId/reviews/:reviewId/reply` | Bearer (`tailor`) | Submits tailor public response to a client review. Enforces tailor profile ownership. |
| `POST` | `/reviews/:reviewId/reply` | Bearer (`tailor`) | Direct alias route for tailor to post a reply to a review. |
| `PATCH` | `/reviews/:reviewId` | Bearer (`customer`) | Edits customer review comment or rating. |
| `DELETE` | `/reviews/:reviewId` | Bearer (`customer`, `admin`) | Removes review and recalculates tailor aggregate star rating. |

---

## 17. Direct Messaging & Conversations (`/conversations`, `/messages`)

Real-time customer-tailor chat, consultations, image attachments, and Supabase Realtime configurations.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/conversations` | Bearer (`Any`) | Lists active chat threads with last message preview and unread counters. |
| `POST` | `/conversations` | Bearer (`Any`) | Starts or retrieves a chat thread with a tailor or customer (`recipientId`, `orderId`, `designId`). |
| `GET` | `/conversations/realtime-config` | Bearer (`Any`) | Returns Supabase Realtime channel subscription keys and WebSocket config. |
| `GET` | `/conversations/:tailorId/:clientId` | Bearer (`Any`) | Retrieves direct conversation thread between tailor and customer by their IDs. |
| `GET` | `/conversations/:tailorId/:clientId/messages` | Bearer (`Any`) | Lists messages in thread between tailor and client. |
| `POST` | `/conversations/:tailorId/:clientId/messages` | Bearer (`Any`) | Sends new message directly to tailor/client thread. |
| `GET` | `/conversations/:conversationId` | Bearer (`Any`) | Retrieves conversation metadata and participant profiles. |
| `GET` | `/conversations/:conversationId/messages` | Bearer (`Any`) | Lists paginated messages for a conversation thread. |
| `POST` | `/conversations/:conversationId/messages` | Bearer (`Any`) | Sends a new text message or attachment in a conversation. |
| `PATCH` | `/conversations/:conversationId/read` | Bearer (`Any`) | Marks all messages in conversation thread as read. |
| `PATCH` | `/messages/:messageId/read` | Bearer (`Any`) | Marks single message as read. |
| `POST` | `/messages/:messageId/attachments` | Bearer (`Any`) | Uploads image or tech pack attachment to a message. |

---

## 18. Notification Center & Push Tokens (`/notifications`)

In-app alerts and mobile push notification delivery.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/notifications` | Bearer (`Any`) | Retrieves user notification feed (order status updates, appointment confirmations, messages). |
| `POST` | `/notifications` | Bearer (`admin`, `system`) | Dispatches new in-app notification to a user. |
| `GET` | `/notifications/unread-count` | Bearer (`Any`) | Returns number of unread notifications for badge display. |
| `POST` | `/notifications/push-token` | Bearer (`Any`) | Registers FCM or Web Push device token for push notification dispatch. |
| `POST` | `/notifications/read-all` | Bearer (`Any`) | Marks all notifications as read for current user. |
| `PATCH` | `/notifications/:notificationId/read` | Bearer (`Any`) | Marks a single notification as read. |
| `DELETE` | `/notifications/:notificationId` | Bearer (`Any`) | Removes a notification. |

---

## 19. Community Fashion Showcase & Social Feed (`/community`)

Social discovery feed where customers and tailors share bespoke outfits, trending embroidery ideas, like, save, and comment.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/community/posts` | Public / Bearer | Retrieves paginated community post feed. Supports query filters: `tag`, `search`, `page`, `limit`. |
| `POST` | `/community/posts` | Bearer (`Any`) | Creates a new fashion post with up to 5 attached images, title, content, and comma-delimited tags. |
| `GET` | `/community/trending` | Public | Returns popular trending tags, trending topics, and top liked posts. |
| `GET` | `/community/following` | Bearer (`Any`) | Feed displaying posts exclusively from users and tailors followed by current user. |
| `GET` | `/community/posts/:postId` | Public / Bearer | Retrieves specific community post with author profile, like counts, and comments. |
| `PATCH` | `/community/posts/:postId` | Bearer (`Any`) | Updates post title, description, or tags. Enforces post author ownership. |
| `DELETE` | `/community/posts/:postId` | Bearer (`Any`, `admin`) | Deletes community post. Accessible to author or admin. |
| `POST` | `/community/posts/:postId/like` | Bearer (`Any`) | Toggles like status on a post and increments/decrements like counter. |
| `POST` | `/community/posts/:postId/save` | Bearer (`Any`) | Saves post to user's saved inspiration collection. |
| `GET` | `/community/posts/:postId/comments` | Public / Bearer | Retrieves comments on a community post. |
| `POST` | `/community/posts/:postId/comments` | Bearer (`Any`) | Adds comment to a community post (`content`). |

---

## 20. Mobile App Versioning & APK Download (`/app-version`)

Powers the mobile Android APK download page and semver update prompt.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/app-version/latest` | Public | Checks latest Android APK release from GitHub or storage, comparing semver client version and returning update requirement flags (`needsUpdate`, `isMandatory`, `downloadUrl`). |

---

## 21. Admin Operations, Disputes & Platform Settings (`/admin`)

Administrative governance, revenue metrics, user moderation, tailor verification, order overrides, disputes, review moderation, and platform settings.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/admin/dashboard/stats` | Bearer (`admin`) | High-level metrics: total users, tailors, active orders, platform GMV, disputes. |
| `GET` | `/admin/dashboard/revenue` | Bearer (`admin`) | Financial revenue breakdown: commission fees earned, gross volume, net payouts. |
| `GET` | `/admin/dashboard/activities` | Bearer (`admin`) | Recent platform audit activity feed (new signups, dispute creations, order updates). |
| `GET` | `/admin/users` | Bearer (`admin`) | Paginated user management table with search and role filters. |
| `POST` | `/admin/users` | Bearer (`admin`) | Admin creation of user profile. |
| `GET` | `/admin/users/:userId` | Bearer (`admin`) | Full user record inspection including security log and role metadata. |
| `PATCH` | `/admin/users/:userId` | Bearer (`admin`) | Modifies user properties, role, or phone verification. |
| `DELETE` | `/admin/users/:userId` | Bearer (`admin`) | Hard deletion of user profile and account. |
| `PATCH` | `/admin/users/:userId/block` | Bearer (`admin`) | Suspends/blocks user from platform access. |
| `PATCH` | `/admin/users/:userId/unblock` | Bearer (`admin`) | Unblocks suspended user account. |
| `GET` | `/admin/tailors` | Bearer (`admin`, `tailor`) | Lists all tailor profiles and verification queue. Permitted for onboarding tailors. |
| `GET` | `/admin/tailors/:tailorId` | Bearer (`admin`) | Full tailor inspection including CNIC documentation, shop license, and bank settings. |
| `PATCH` | `/admin/tailors/:tailorId` | Bearer (`admin`) | Updates tailor details, status, or featured badge. |
| `PATCH` | `/admin/tailors/:tailorId/verify` | Bearer (`admin`) | Approves tailor verification application and awards verified badge. |
| `PATCH` | `/admin/tailors/:tailorId/reject` | Bearer (`admin`) | Rejects tailor verification with reason note. |
| `GET` | `/admin/orders` | Bearer (`admin`) | Master order list with stage filters, customer/tailor info, and dispute flags. |
| `GET` | `/admin/orders/:orderId` | Bearer (`admin`) | Full order inspection with payment intents and courier tracking history. |
| `PATCH` | `/admin/orders/:orderId/status` | Bearer (`admin`) | Admin override of order progress stage or manual force cancellation. |
| `GET` | `/admin/payments` | Bearer (`admin`) | Comprehensive platform transaction log. |
| `GET` | `/admin/payments/transactions` | Bearer (`admin`) | Platform payment transactions ledger. |
| `GET` | `/admin/payments/payouts` | Bearer (`admin`) | Tailor withdrawal request queue with bank details. |
| `POST` | `/admin/payments/payouts/:id` | Bearer (`admin`) | Approves and marks tailor payout withdrawal as dispatched. |
| `PATCH` | `/admin/payments/payouts/:id` | Bearer (`admin`) | Updates payout status (`approved`, `rejected`, `processing`). |
| `POST` | `/admin/payments/refund` | Bearer (`admin`) | Issues full or partial payment refund for an order back to client card/wallet. |
| `GET` | `/admin/disputes` | Bearer (`admin`) | Order dispute queue with evidence photos, customer notes, and tailor responses. |
| `POST` | `/admin/disputes/:id/resolve` | Bearer (`admin`) | Resolves dispute with resolution ruling (`refund_customer`, `release_to_tailor`, `split`). |
| `GET` | `/admin/reviews` | Bearer (`admin`) | Master review list for content moderation. |
| `POST` | `/admin/reviews/:id/moderate` | Bearer (`admin`) | Flags, approves, or hides a review violating community standards. |
| `GET` | `/admin/cms` | Bearer (`admin`) | Fetches CMS content strings, FAQ entries, and homepage banners. |
| `PUT` | `/admin/cms` | Bearer (`admin`) | Commits updates to CMS content. |
| `GET` | `/admin/settings` | Bearer (`admin`) | System-wide platform settings (commission rate, escrow release delay, maintenance mode). |
| `PUT` | `/admin/settings` | Bearer (`admin`) | Updates platform operational configurations. |
| `GET` | `/admin/reports` | Bearer (`admin`) | Queue of user-submitted safety reports against users, posts, or tailors. |
| `DELETE` | `/admin/community/posts/:postId` | Bearer (`admin`) | Admin moderation endpoint deleting offensive community post. |

---

## 22. Content Encyclopedia, Blogs & Inquiries (`/cms`, `/contact`, `/fabrics`, `/blog`)

Curated knowledge bases, fabric dictionary, editorial blog articles, and customer contact inquiries.

| Method | Endpoint | Auth / Role | Description & Functionality |
|---|---|---|---|
| `GET` | `/cms` | Public | Retrieves public website CMS content (homepage banners, FAQ, help center topics). |
| `POST` | `/contact` | Public / Bearer | Submits contact inquiry or customer support ticket. Escapes HTML content and sends notification email. |
| `GET` | `/fabrics` | Public | Fabric encyclopedia with Pakistani seasonal textiles (Silk, Jamawar, Organza, Lawn, Chiffon, Khaddar) with care guides and suitable garments. |
| `GET` | `/fabrics/:fabricId` | Public | Detailed textile page with care instructions, shrinkage guidelines, and recommended silhouettes. |
| `POST` | `/fabrics` | Bearer (`admin`) | Adds new textile material to fabric dictionary. |
| `PATCH` | `/fabrics/:fabricId` | Bearer (`admin`) | Updates fabric details, care guides, or pricing. |
| `DELETE` | `/fabrics/:fabricId` | Bearer (`admin`) | Removes fabric entry from dictionary. |
| `GET` | `/blog` | Public | Lists editorial articles on Pakistani fashion, styling tips, seasonal color palettes, and tailoring guides. |
| `GET` | `/blog/:slug` | Public | Full article text by URL slug with reading time, author, and related post suggestions. |
| `POST` | `/blog` | Bearer (`admin`) | Publishes new editorial blog article (`title`, `slug`, `content`, `coverImage`, `tags`). |
| `PATCH` | `/blog/:slug` | Bearer (`admin`) | Updates blog article text, cover image, or publishing status. |
| `DELETE` | `/blog/:slug` | Bearer (`admin`) | Deletes blog post by slug. |
