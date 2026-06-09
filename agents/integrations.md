# Integrations

This document describes all third-party services and external integrations used by the Sui Dhaga backend.

---

# Overview

Sui Dhaga integrates with:

```txt
Supabase
OpenAI
Google Maps Platform
Stripe
Safepay
Email Provider
Expo Notifications
```

---

# Supabase

Supabase is the primary backend infrastructure.

Used for:

```txt
PostgreSQL Database
Authentication
Storage
Realtime
Row Level Security (RLS)
Database Migrations
```

Configuration:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Responsibilities:

```txt
User Authentication
Database Operations
File Storage
Realtime Messaging
Realtime Notifications
Realtime Updates
```

Backend configuration:

```txt
src/config/supabase.ts
```

---

# OpenAI

OpenAI powers the AI Design Studio.

Used for:

```txt
Text to Design
Image to Design
Sketch to Design
Design Chat
Design Variations
Prompt Enhancement
Fashion Recommendations
Tech Pack Assistance
```

Endpoints:

```txt
/designs/text-to-design
/designs/image-to-design
/designs/sketch-to-design
/designs/chat
/designs/[designId]/chat
```

Configuration:

```env
OPENAI_API_KEY=
```

Backend service:

```txt
src/services/ai.service.ts
```

Responsibilities:

```txt
Prompt Construction
Model Invocation
Response Processing
Design Metadata Generation
Error Handling
Usage Tracking
```

---

# Google Maps Platform

Used for tailor discovery and location services.

Services:

```txt
Maps SDK
Places API
Geocoding API
Distance Matrix API
```

Features:

```txt
Tailor Map View
Nearby Tailors
Location Search
Distance Calculation
Address Conversion
Area Search
```

Endpoints:

```txt
/tailors/nearby
/tailors/map
```

Configuration:

```env
GOOGLE_MAPS_API_KEY=
```

Backend service:

```txt
src/services/maps.service.ts
```

---

# Stripe

Primary international payment gateway.

Features:

```txt
Checkout Sessions
Payment Processing
Refunds
Payment History
Webhook Events
Subscription Support (Future)
```

Endpoints:

```txt
/payments/create-checkout
/payments/confirm
/payments/webhook
```

Configuration:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Backend service:

```txt
src/services/payment.service.ts
```

---

# Safepay

Pakistan-focused payment gateway.

Features:

```txt
Local Payments
Checkout Sessions
Payment Confirmation
Webhook Events
Refund Handling
```

Endpoints:

```txt
/payments/create-checkout
/payments/confirm
/payments/webhook
```

Configuration:

```env
SAFEPAY_SECRET_KEY=
SAFEPAY_WEBHOOK_SECRET=
```

Backend service:

```txt
src/services/payment.service.ts
```

---

# Email Provider

Recommended:

```txt
Resend
```

Alternative:

```txt
Brevo
```

Used for:

```txt
Welcome Email
Email Verification
Password Reset
Booking Confirmation
Order Updates
Payment Confirmation
Tailor Verification Updates
Admin Notifications
```

Endpoints:

```txt
/auth/verify-email
/auth/forgot-password
/auth/reset-password
```

Configuration:

```env
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=
```

Backend service:

```txt
src/services/email.service.ts
```

---

# Expo Notifications

Used for mobile push notifications.

Features:

```txt
New Message
Appointment Updates
Order Updates
Payment Updates
Community Activity
Tailor Verification Updates
System Notifications
```

Configuration:

```env
EXPO_ACCESS_TOKEN=
```

Backend service:

```txt
src/services/notification.service.ts
```

---

# Supabase Storage

Storage Buckets:

```txt
avatars
designs
tailor-gallery
community-posts
verification-documents
message-attachments
exports
references
```

Stored Files:

```txt
Profile Images
Design Images
Reference Images
Sketch Uploads
Gallery Images
Verification Documents
Community Images
PDF Exports
Chat Attachments
```

Endpoints:

```txt
/uploads/image
/uploads/images
/uploads/file
/uploads/[fileId]
```

Backend service:

```txt
src/services/storage.service.ts
```

---

# Supabase Realtime

Realtime communication layer.

Used for:

```txt
Messages
Notifications
Order Status Updates
Appointment Updates
Tailor Verification Updates
```

Examples:

```txt
New Message Received
Order Status Changed
Appointment Rescheduled
Payment Confirmed
```

Backend implementation:

```txt
Supabase Realtime Channels
```

No Socket.IO is used.

---

# Future Integrations

Possible future additions:

```txt
PostHog (Analytics)
Sentry (Error Monitoring)
Logtail (Logging)
Cloudflare R2 (Backup Storage)
```

---

# Security Rules

Never expose:

```txt
Service Role Keys
Stripe Secrets
Safepay Secrets
OpenAI Keys
Email Provider Keys
```

Store all secrets in:

```env
.env
```

Never commit secrets to Git.

---

# Integration Ownership

```txt
Supabase            → Database/Auth/Storage/Realtime
OpenAI              → AI Design Studio
Google Maps         → Location Services
Stripe              → International Payments
Safepay             → Pakistan Payments
Resend/Brevo        → Email Delivery
Expo Notifications  → Mobile Push Notifications
```

---

# Final Goal

All integrations should be:

```txt
Secure
Centralized
Replaceable
Environment Configurable
Well Documented
Easy for AI Agents to Understand
Easy to Scale
```
