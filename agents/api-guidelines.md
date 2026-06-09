# API Guidelines

These guidelines define how APIs should be created in the Sui Dhaga backend.

---

# Base API Pattern

All API routes should start with:

```txt
/api/v1
```

Example:

```txt
/api/v1/auth/login
/api/v1/tailors
/api/v1/orders
```

---

# REST Rules

Use REST-style endpoints.

```txt
GET     /tailors
GET     /tailors/:id
POST    /tailors
PATCH   /tailors/:id
DELETE  /tailors/:id
```

Avoid action-style routes unless necessary.

Bad:

```txt
/getTailors
/createOrder
/deleteUser
```

Good:

```txt
GET /tailors
POST /orders
DELETE /users/:id
```

---

# Standard Response Format

Success response:

```json
{
  "success": true,
  "message": "Request successful",
  "data": {}
}
```

List response:

```json
{
  "success": true,
  "message": "Tailors fetched successfully",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error response:

```json
{
  "success": false,
  "message": "Something went wrong"
}
```

---

# Status Codes

Use correct HTTP status codes.

```txt
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
500 Internal Server Error
```

---

# Pagination

All list endpoints should support pagination.

```txt
GET /tailors?page=1&limit=20
GET /orders?page=1&limit=10
GET /community/posts?page=1&limit=20
```

Default values:

```txt
page = 1
limit = 20
```

Maximum limit:

```txt
limit = 100
```

---

# Filtering

Use query parameters for filters.

Examples:

```txt
GET /tailors?city=Lahore
GET /tailors?specialty=bridal
GET /orders?status=in_progress
GET /appointments?status=upcoming
```

---

# Searching

Use `q` for search queries.

```txt
GET /tailors?q=bridal
GET /messages?q=design
GET /community/posts?q=kurta
```

---

# Sorting

Use `sortBy` and `sortOrder`.

```txt
GET /tailors?sortBy=rating&sortOrder=desc
GET /orders?sortBy=created_at&sortOrder=desc
```

Allowed sort order:

```txt
asc
desc
```

---

# Authentication

Protected routes must require a valid Supabase auth token.

Frontend should send:

```txt
Authorization: Bearer <access_token>
```

Backend should verify token before accessing protected routes.

---

# Role-Based Access

Supported roles:

```txt
customer
tailor
admin
```

Examples:

```txt
/customer/orders        customer only
/tailor-dashboard       tailor only
/admin/dashboard        admin only
```

Never trust role values sent from frontend body.

---

# Validation

All request bodies must be validated using Zod.

Example:

```ts
const CreateBookingSchema = z.object({
  tailorId: z.string(),
  serviceId: z.string(),
  date: z.string(),
  time: z.string(),
  notes: z.string().optional()
});
```

Invalid request response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

---

# File Upload APIs

Use Supabase Storage for uploaded files.

Upload examples:

```txt
POST /uploads/profile-image
POST /uploads/design-reference
POST /uploads/tailor-gallery
POST /uploads/verification-document
```

Return uploaded file URL:

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://..."
  }
}
```

---

# Realtime APIs

Use Supabase Realtime or Socket.IO for:

```txt
messages
notifications
order status updates
appointment updates
```

---

# AI APIs

AI generation endpoints should be clear and limited.

Examples:

```txt
POST /designs/text-to-design
POST /designs/image-to-design
POST /designs/sketch-to-design
POST /designs/chat
```

AI responses should save generated design metadata in database.

---

# Payment APIs

Payment endpoints must be secure and logged.

Examples:

```txt
POST /payments/create-intent
POST /payments/confirm
POST /payments/refund
POST /payments/webhook
```

Webhook routes must verify payment provider signatures.

---

# Admin APIs

Admin APIs must always require admin authorization.

Examples:

```txt
GET /admin/users
PATCH /admin/users/:id/block
GET /admin/tailors
PATCH /admin/tailors/:id/approve
PATCH /admin/tailors/:id/reject
```

---

# API Versioning

Current version:

```txt
/api/v1
```

Future versions:

```txt
/api/v2
```

Never break existing frontend/mobile clients without versioning.

---

# Final Rule

Every API must be:

* Secure
* Validated
* Paginated where needed
* Role protected where needed
* Consistent in response format
