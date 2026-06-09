# Sui Dhaga Backend Agents Guide

This folder contains backend instructions for AI agents and developers working on the **Sui Dhaga Backend**.

Sui Dhaga is a tailoring marketplace and AI clothing design platform. The backend is built with:

* Node.js
* Express.js
* TypeScript
* Supabase
* Supabase Auth
* Supabase Storage
* Supabase Realtime

## Recommended Reading Order

1. `README.md`
2. `architecture.md`
3. `backend-rules.md`
4. `api-guidelines.md`
5. `auth-rules.md`
6. `endpoints.md`
7. `integrations.md`

## Agent Rules

Before creating or editing backend code:

* Follow the existing folder structure.
* Keep code modular and feature-based.
* Use TypeScript everywhere.
* Validate all request bodies.
* Use Supabase for database, auth, storage, and realtime features.
* Do not use Prisma.
* Do not create database schema files inside `agents/`.
* Keep SQL migrations inside the `supabase/migrations/` folder.
* Never hardcode API keys or secrets.
* Use `.env` variables for configuration.
* Use consistent API response formats.
* Protect customer, tailor, and admin routes with role-based authorization.

## Main Backend Areas

* Auth
* Users
* Tailors
* Bookings
* Appointments
* Orders
* AI Design Studio
* Measurements
* Community
* Messages
* Payments
* Reviews
* Notifications
* Uploads
* Admin

## Goal

The backend should be clean, scalable, secure, and easy for both developers and AI agents to understand.
