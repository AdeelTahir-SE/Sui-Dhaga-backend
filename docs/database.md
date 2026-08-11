# Database Architecture & Migrations

Sui Dhaga uses Supabase PostgreSQL as its primary database infrastructure.

## SQL Migrations
All schema changes are tracked via migration SQL files located in [`supabase/migrations/`](file:///d:/Projects/Sui-Dhaga-backend/supabase/migrations/001_initial_schema.sql).

Do NOT use Prisma, TypeORM, or Sequelize.
