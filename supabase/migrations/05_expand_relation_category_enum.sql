-- Migration 05: Expand relation_category enum with new UI categories
-- Note: ALTER TYPE ... ADD VALUE cannot be executed inside a transaction block.

ALTER TYPE public.relation_category ADD VALUE IF NOT EXISTS 'Immediate Family';
ALTER TYPE public.relation_category ADD VALUE IF NOT EXISTS 'Extended Family';
ALTER TYPE public.relation_category ADD VALUE IF NOT EXISTS 'In-Laws & Step Family';
ALTER TYPE public.relation_category ADD VALUE IF NOT EXISTS 'Social & Personal';