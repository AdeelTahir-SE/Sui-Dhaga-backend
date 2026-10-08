-- Sui Dhaga Migration: 011_tailor_availability_enhancements.sql
-- Adds break columns and indices for tailor availability working hours persistence

alter table public.tailor_availability 
add column if not exists has_break boolean not null default false,
add column if not exists break_start text,
add column if not exists break_end text;

create index if not exists idx_tailor_availability_tailor_lookup 
on public.tailor_availability (tailor_id, day_of_week);
