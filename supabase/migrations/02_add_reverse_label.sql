-- 1. Add the reverse relationship column to store "Husband", "Subordinate", etc.
ALTER TABLE public.edges ADD COLUMN IF NOT EXISTS reverse_label text;

-- 2. Make the old 'type' column optional, so our new UI inserts don't crash
ALTER TABLE public.edges ALTER COLUMN type DROP NOT NULL;