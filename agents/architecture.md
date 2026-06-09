# Backend Architecture

Sui Dhaga backend follows a modular Node.js + Express.js + TypeScript architecture using Supabase as the database, auth, storage, and realtime provider.

---

# Core Stack

```txt
Node.js
Express.js
TypeScript
Supabase PostgreSQL
Supabase Auth
Supabase Storage
Supabase Realtime
Zod
```

---

# Request Flow

```txt
Client Request
→ Express Route
→ Middleware
→ Validator
→ Controller
→ Service
→ Repository / Supabase Client
→ Response
```

---

# Main Backend Structure

```txt
sui-dhaga-backend/
├── agents/
│   ├── README.md
│   ├── backend-rules.md
│   ├── api-guidelines.md
│   ├── endpoints.md
│   ├── auth-rules.md
│   ├── architecture.md
│   └── integrations.md
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   ├── cors.ts
│   │   └── supabase.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── tailors/
│   │   ├── services/
│   │   ├── availability/
│   │   ├── appointments/
│   │   ├── orders/
│   │   ├── tracking/
│   │   ├── conversations/
│   │   ├── messages/
│   │   ├── designs/
│   │   ├── exports/
│   │   ├── measurements/
│   │   ├── community/
│   │   ├── fabrics/
│   │   ├── reviews/
│   │   ├── wishlist/
│   │   ├── payments/
│   │   ├── notifications/
│   │   ├── uploads/
│   │   └── admin/
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   ├── ownership.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── utils/
│   │   ├── api-response.ts
│   │   ├── async-handler.ts
│   │   ├── app-error.ts
│   │   └── constants.ts
│   ├── services/
│   │   ├── ai.service.ts
│   │   ├── email.service.ts
│   │   ├── maps.service.ts
│   │   ├── payment.service.ts
│   │   ├── storage.service.ts
│   │   └── notification.service.ts
│   ├── types/
│   │   ├── express.d.ts
│   │   └── index.ts
│   ├── routes/
│   │   └── index.ts
│   ├── app.ts
│   └── server.ts
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── seed/
│   │   └── seed.sql
│   ├── policies/
│   │   └── rls-policies.sql
│   ├── storage/
│   │   └── buckets.sql
│   └── functions/
├── docs/
│   ├── api.md
│   ├── deployment.md
│   ├── database.md
│   └── supabase.md
├── .env.example
├── README.md
├── package.json
└── tsconfig.json
```

---

# Module Structure

Each module should be isolated.

```txt
modules/orders/
├── orders.routes.ts
├── orders.controller.ts
├── orders.service.ts
├── orders.validator.ts
├── orders.types.ts
└── orders.repository.ts
```

`repository.ts` is optional. Use it when the module has many Supabase queries.

---

# Main Modules

```txt
auth
users
tailors
bookings
appointments
orders
design-studio
measurements
community
messages
payments
reviews
notifications
uploads
admin
```

---

# Middleware Layer

Middlewares handle:

```txt
Authentication
Role authorization
Validation
Error handling
File upload checks
Rate limiting
```

Example:

```txt
auth.middleware.ts
role.middleware.ts
validation.middleware.ts
error.middleware.ts
```

---

# Config Layer

The `config/` folder stores app configuration.

```txt
config/
├── env.ts
├── cors.ts
└── supabase.ts
```

No secrets should be hardcoded.

---

# Service Layer

The `services/` folder is for shared integrations.

```txt
services/
├── ai.service.ts
├── email.service.ts
├── maps.service.ts
├── payment.service.ts
└── storage.service.ts
```

Feature-specific logic should stay inside module services.

---

# Supabase Layer

Supabase is used for:

```txt
Database
Authentication
Storage
Realtime
RLS Policies
SQL Migrations
```

Supabase files live in:

```txt
supabase/
├── migrations/
├── seed/
├── functions/
├── policies/
└── storage/
```

---

# Database Changes

All database changes must be written as SQL migration files.

Location:

```txt
supabase/migrations/
```

Example:

```txt
001_initial_schema.sql
002_add_orders_table.sql
003_add_tailor_reviews.sql
```

Do not use Prisma.

---

# Auth Architecture

Supabase Auth manages sessions.

Backend responsibilities:

```txt
Verify access token
Attach user to request
Check role
Check ownership
Protect private routes
```

---

# Storage Architecture

Supabase Storage is used for:

```txt
User avatars
Tailor gallery images
Verification documents
Design references
Generated design images
Community post images
PDF tech packs
Message attachments
```

---

# Realtime Architecture

Realtime features:

```txt
Messages
Notifications
Order status updates
Appointment status updates
```

Use Supabase Realtime or Socket.IO where required.

---

# AI Design Architecture

AI design routes should:

```txt
Receive input
Validate input
Call AI provider
Store generated result
Return design preview
Allow editing/export
```

Main AI flows:

```txt
Text to Design
Image to Design
Sketch to Design
Chat-based Design
Tech Pack PDF Export
```

---

# Payment Architecture

Payment flow:

```txt
Create checkout
User pays
Payment provider confirms
Webhook verifies payment
Order/payment status updates
Notification sent
```

Webhook signature verification is required.

---

# Admin Architecture

Admin APIs are separated under:

```txt
/admin
```

Admin can manage:

```txt
Users
Tailors
Orders
Payments
Reports
Community posts
Verification requests
```

---

# Final Goal

The backend should be:

```txt
Modular
Secure
Scalable
Supabase-first
Easy for agents to maintain
```
