-- DEV-004 PostgreSQL foundation.
-- Additive only: no business table is introduced by this migration.

-- Case-insensitive domain columns may use citext after owning-module review.
CREATE EXTENSION IF NOT EXISTS "citext";

-- PostgreSQL search uses trigram similarity for reviewed query paths.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
