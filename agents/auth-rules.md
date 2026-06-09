# Auth Rules

Sui Dhaga uses Supabase Auth for authentication.

---

# User Roles

Supported roles:

```txt
customer
tailor
admin
```

Every authenticated user must have one role.

---

# Auth Token

Frontend and mobile app must send token like this:

```txt
Authorization: Bearer <access_token>
```

Backend must verify this token before allowing protected actions.

---

# Public Routes

These routes do not require login:

```txt
/auth/register
/auth/login
/auth/forgot-password
/auth/reset-password
/auth/verify-email
/tailors
/tailors/[tailorId]
/tailors/[tailorId]/reviews
/community/posts
/community/posts/[postId]
/fabrics
/fabrics/[fabricId]
```

---

# Protected Routes

These routes require login:

```txt
/auth/logout
/auth/me
/users/me
/appointments
/orders
/conversations
/designs
/measurements
/wishlist
/payments/history
/notifications
/uploads
```

---

# Customer-Only Routes

Only customers can access:

```txt
/appointments
/orders
/designs
/measurements
/wishlist
/payments/create-checkout
/payments/confirm
```

---

# Tailor-Only Routes

Only tailors can access:

```txt
/tailors
/tailors/[tailorId]
/tailors/[tailorId]/services
/tailors/[tailorId]/availability
/tailors/[tailorId]/gallery
/tailors/[tailorId]/verify
/orders/[orderId]/status
/orders/[orderId]/tracking
```

Tailors can only update their own tailor profile.

---

# Admin-Only Routes

Only admins can access:

```txt
/admin/dashboard/stats
/admin/users
/admin/tailors
/admin/orders
/admin/payments
/admin/reports
/admin/community/posts/[postId]
```

---

# Ownership Rules

Users can only update their own data.

Examples:

* Customer can only update their own profile.
* Customer can only view their own orders.
* Customer can only view their own measurements.
* Tailor can only update their own services.
* Tailor can only update orders assigned to them.
* Admin can manage all users, tailors, orders, payments, and reports.

---

# Role Verification

Never trust role from request body.

Bad:

```json
{
  "role": "admin"
}
```

Always fetch role from database or Supabase user metadata.

---

# Middleware Flow

Use this order:

```txt
validateToken
attachUser
requireRole
checkOwnership
controller
```

---

# Registration Rules

During registration:

* Customer can register directly.
* Tailor can register but must complete onboarding.
* Tailor verification should remain pending until admin approval.
* Admin accounts should not be created from public registration.

---

# Tailor Verification Status

Tailor verification statuses:

```txt
pending
verified
rejected
suspended
```

Only verified tailors should appear publicly.

---

# Account Status

User account statuses:

```txt
active
blocked
deleted
```

Blocked users cannot login or perform protected actions.

---

# Password Reset

Password reset flow:

```txt
/auth/forgot-password
/auth/reset-password
```

Do not expose whether an email exists or not.

Use generic message:

```txt
If this email exists, a reset link has been sent.
```

---

# Logout

Logout should invalidate the current session where possible.

---

# Security Rules

* Never expose password hashes.
* Never log access tokens.
* Never return sensitive auth metadata.
* Always validate token expiry.
* Always protect admin routes.
