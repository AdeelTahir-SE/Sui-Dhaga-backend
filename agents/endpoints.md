# Sui Dhaga Backend Endpoints

This document is the source of truth for all backend endpoints.

Base URL:

```txt
/api/v1
```

---

# Auth

| Method | Endpoint              |
| ------ | --------------------- |
| POST   | /auth/register        |
| POST   | /auth/login           |
| POST   | /auth/logout          |
| GET    | /auth/me              |
| POST   | /auth/refresh-token   |
| POST   | /auth/forgot-password |
| POST   | /auth/reset-password  |
| POST   | /auth/verify-email    |

---

# Users

| Method | Endpoint         |
| ------ | ---------------- |
| GET    | /users/me        |
| PATCH  | /users/me        |
| PATCH  | /users/me/avatar |
| DELETE | /users/me        |
| GET    | /users/[userId]  |

---

# Tailors

| Method | Endpoint                              |
| ------ | ------------------------------------- |
| GET    | /tailors                              |
| POST   | /tailors                              |
| GET    | /tailors/nearby                       |
| GET    | /tailors/map                          |
| GET    | /tailors/[tailorId]                   |
| PATCH  | /tailors/[tailorId]                   |
| DELETE | /tailors/[tailorId]                   |
| POST   | /tailors/[tailorId]/gallery           |
| DELETE | /tailors/[tailorId]/gallery/[imageId] |
| POST   | /tailors/[tailorId]/verify            |
| POST   | /tailors/compare                      |

---

# Tailor Services

| Method | Endpoint                                 |
| ------ | ---------------------------------------- |
| GET    | /tailors/[tailorId]/services             |
| POST   | /tailors/[tailorId]/services             |
| PATCH  | /tailors/[tailorId]/services/[serviceId] |
| DELETE | /tailors/[tailorId]/services/[serviceId] |

---

# Tailor Availability

| Method | Endpoint                         |
| ------ | -------------------------------- |
| GET    | /tailors/[tailorId]/availability |
| POST   | /tailors/[tailorId]/availability |
| PATCH  | /availability/[slotId]           |
| DELETE | /availability/[slotId]           |

---

# Appointments

| Method | Endpoint                                 |
| ------ | ---------------------------------------- |
| GET    | /appointments                            |
| POST   | /appointments                            |
| GET    | /appointments/[appointmentId]            |
| PATCH  | /appointments/[appointmentId]/status     |
| PATCH  | /appointments/[appointmentId]/reschedule |
| DELETE | /appointments/[appointmentId]            |

---

# Orders

| Method | Endpoint                  |
| ------ | ------------------------- |
| GET    | /orders                   |
| POST   | /orders                   |
| GET    | /orders/[orderId]         |
| PATCH  | /orders/[orderId]/status  |
| POST   | /orders/[orderId]/cancel  |
| GET    | /orders/[orderId]/invoice |

---

# Order Tracking

| Method | Endpoint                                |
| ------ | --------------------------------------- |
| GET    | /orders/[orderId]/tracking              |
| POST   | /orders/[orderId]/tracking              |
| PATCH  | /orders/[orderId]/tracking/[trackingId] |

---

# Conversations & Messages

| Method | Endpoint                                 |
| ------ | ---------------------------------------- |
| GET    | /conversations                           |
| POST   | /conversations                           |
| GET    | /conversations/[conversationId]          |
| GET    | /conversations/[tailorId]/[clientId]     |
| GET    | /conversations/[conversationId]/messages |
| POST   | /conversations/[conversationId]/messages |
| PATCH  | /messages/[messageId]/read               |
| POST   | /messages/[messageId]/attachments        |

---

# Designs

| Method | Endpoint                              |
| ------ | ------------------------------------- |
| GET    | /designs                              |
| GET    | /designs/[designId]                   |
| POST   | /designs/text-to-design               |
| POST   | /designs/image-to-design              |
| POST   | /designs/sketch-to-design             |
| POST   | /designs/chat                         |
| PATCH  | /designs/[designId]                   |
| DELETE | /designs/[designId]                   |
| POST   | /designs/[designId]/duplicate         |
| POST   | /designs/[designId]/share-with-tailor |

---

# Design Customization

| Method | Endpoint                         |
| ------ | -------------------------------- |
| GET    | /designs/[designId]/chat         |
| POST   | /designs/[designId]/chat         |
| PATCH  | /designs/[designId]/colors       |
| PATCH  | /designs/[designId]/fabric       |
| PATCH  | /designs/[designId]/embroidery   |
| PATCH  | /designs/[designId]/measurements |
| PATCH  | /designs/[designId]/notes        |

---

# PDF Export

| Method | Endpoint                       |
| ------ | ------------------------------ |
| POST   | /designs/[designId]/export-pdf |
| GET    | /designs/[designId]/pdf        |
| GET    | /exports                       |

---

# Measurements

| Method | Endpoint                      |
| ------ | ----------------------------- |
| GET    | /measurements                 |
| POST   | /measurements                 |
| GET    | /measurements/[measurementId] |
| PATCH  | /measurements/[measurementId] |
| DELETE | /measurements/[measurementId] |

---

# Community

| Method | Endpoint                           |
| ------ | ---------------------------------- |
| GET    | /community/posts                   |
| POST   | /community/posts                   |
| GET    | /community/posts/[postId]          |
| PATCH  | /community/posts/[postId]          |
| DELETE | /community/posts/[postId]          |
| POST   | /community/posts/[postId]/like     |
| POST   | /community/posts/[postId]/save     |
| GET    | /community/posts/[postId]/comments |
| POST   | /community/posts/[postId]/comments |

---

# Fabrics

| Method | Endpoint            |
| ------ | ------------------- |
| GET    | /fabrics            |
| POST   | /fabrics            |
| GET    | /fabrics/[fabricId] |
| PATCH  | /fabrics/[fabricId] |
| DELETE | /fabrics/[fabricId] |

---

# Reviews

| Method | Endpoint                    |
| ------ | --------------------------- |
| GET    | /tailors/[tailorId]/reviews |
| POST   | /orders/[orderId]/review    |
| PATCH  | /reviews/[reviewId]         |
| DELETE | /reviews/[reviewId]         |

---

# Wishlist

| Method | Endpoint                     |
| ------ | ---------------------------- |
| GET    | /wishlist                    |
| POST   | /wishlist/tailors/[tailorId] |
| DELETE | /wishlist/tailors/[tailorId] |
| POST   | /wishlist/designs/[designId] |
| DELETE | /wishlist/designs/[designId] |

---

# Payments

| Method | Endpoint                  |
| ------ | ------------------------- |
| POST   | /payments/create-checkout |
| POST   | /payments/confirm         |
| GET    | /payments/history         |
| GET    | /payments/[paymentId]     |
| POST   | /payments/webhook         |

---

# Notifications

| Method | Endpoint                             |
| ------ | ------------------------------------ |
| GET    | /notifications                       |
| PATCH  | /notifications/[notificationId]/read |
| PATCH  | /notifications/read-all              |
| DELETE | /notifications/[notificationId]      |

---

# Uploads

| Method | Endpoint          |
| ------ | ----------------- |
| POST   | /uploads/image    |
| POST   | /uploads/images   |
| POST   | /uploads/file     |
| DELETE | /uploads/[fileId] |

---

# Admin

| Method | Endpoint                         |
| ------ | -------------------------------- |
| GET    | /admin/dashboard/stats           |
| GET    | /admin/users                     |
| PATCH  | /admin/users/[userId]/block      |
| PATCH  | /admin/users/[userId]/unblock    |
| GET    | /admin/tailors                   |
| PATCH  | /admin/tailors/[tailorId]/verify |
| PATCH  | /admin/tailors/[tailorId]/reject |
| GET    | /admin/orders                    |
| GET    | /admin/payments                  |
| GET    | /admin/reports                   |
| DELETE | /admin/community/posts/[postId]  |

---
