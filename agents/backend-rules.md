# Backend Development Rules

These rules must be followed by all developers and AI agents working on the Sui Dhaga backend.

---

# General Principles

* Use TypeScript only.
* Follow feature/module-based architecture.
* Keep business logic out of route files.
* Keep controllers thin.
* Services contain business logic.
* Use async/await everywhere.
* Avoid duplicated code.
* Prefer reusable utility functions.

---

# Folder Structure Rules

Every module should follow this structure:

```txt
module-name/
├── controller.ts
├── service.ts
├── validator.ts
├── types.ts
├── routes.ts
└── repository.ts (optional)
```

Example:

```txt
orders/
├── orders.controller.ts
├── orders.service.ts
├── orders.validator.ts
├── orders.types.ts
└── orders.routes.ts
```

---

# Naming Conventions

## Files

Use kebab-case.

Examples:

```txt
orders.service.ts
orders.controller.ts
tailors.routes.ts
```

## Variables

Use camelCase.

```ts
userId
tailorProfile
orderStatus
```

## Types

Use PascalCase.

```ts
User
Tailor
Order
Booking
```

---

# Route Rules

Bad:

```ts
POST /createOrder
GET /getOrders
```

Good:

```ts
POST /orders
GET /orders
GET /orders/:id
PATCH /orders/:id
DELETE /orders/:id
```

Use REST conventions whenever possible.

---

# Controller Rules

Controllers should:

* Extract request data
* Call services
* Return responses

Controllers should NOT:

* Query database directly
* Contain business logic
* Handle payment logic
* Handle AI generation logic

Bad:

```ts
router.post("/", async (req, res) => {
  // 200 lines of business logic
});
```

Good:

```ts
const createOrder = async (req, res) => {
  const result = await ordersService.createOrder(req.body);

  return success(res, result);
};
```

---

# Service Rules

Services contain:

* Business logic
* Validation logic
* Database operations
* External integrations

Examples:

```txt
Create Order
Cancel Order
Generate Design
Create Booking
Approve Tailor
```

---

# Validation Rules

Every request body must be validated.

Use:

* Zod

Example:

```ts
const CreateOrderSchema = z.object({
  tailorId: z.string(),
  serviceId: z.string()
});
```

Never trust frontend data.

---

# Error Handling

Always throw meaningful errors.

Bad:

```ts
throw new Error("Failed");
```

Good:

```ts
throw new AppError(
  "Order not found",
  404
);
```

Use centralized error middleware.

---

# API Response Format

Success:

```json
{
  "success": true,
  "message": "Order created",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Order not found"
}
```

Keep format consistent across all endpoints.

---

# Database Rules

Use Supabase only.

Do not:

* Use Prisma
* Use TypeORM
* Use Sequelize

Database changes must be created as SQL migrations.

Location:

```txt
supabase/migrations/
```

---

# Storage Rules

All uploads must use:

* Supabase Storage

Examples:

```txt
Profile Images
Design Images
Reference Images
Gallery Images
Verification Documents
```

---

# Security Rules

Never trust client role values.

Always verify:

* Authenticated user
* User role
* Resource ownership

Example:

Customer must not access:

```txt
/tailor-dashboard/*
```

Tailor must not access:

```txt
/admin/*
```

---

# Logging

Log:

* Payments
* AI generations
* Failed requests
* Critical actions

Do not log:

* Passwords
* Tokens
* Sensitive personal data

---

# Performance Rules

Use pagination for lists.

Bad:

```ts
GET /tailors
```

Returning 10,000 rows.

Good:

```ts
GET /tailors?page=1&limit=20
```

---

# Final Goal

The backend must remain:

* Modular
* Secure
* Scalable
* Easy for AI agents to maintain
* Easy for new developers to understand
