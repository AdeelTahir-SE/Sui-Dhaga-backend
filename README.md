# Sui Dhaga Backend

TypeScript Express API for the Sui Dhaga tailoring marketplace and AI design studio.

## Quick start

1. Copy `.env.example` to `.env` and add Supabase credentials.
2. Run `npm install`.
3. Apply `supabase/migrations/001_initial_schema.sql` to your Supabase project.
4. Run `npm run dev`.

The API is available at `/api/v1`; `GET /health` is public. All list responses support `page` and `limit` (maximum 100), authenticated routes require `Authorization: Bearer <access_token>`, and success/error responses share one consistent shape.
