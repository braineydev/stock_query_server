BEGIN;

CREATE TABLE IF NOT EXISTS public.tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CHECK (id <> ''),
  CHECK (status IN ('active', 'inactive'))
);

INSERT INTO public.tenants (id, name, status)
VALUES ('global', 'Global Tenant', 'active')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE public.users
SET tenant_id = 'global'
WHERE tenant_id IS NULL OR BTRIM(tenant_id) = '';

ALTER TABLE public.users
  ALTER COLUMN tenant_id SET DEFAULT 'global';

ALTER TABLE public.users
  ALTER COLUMN tenant_id SET NOT NULL;

DO $$
DECLARE
  username_unique_constraint TEXT;
BEGIN
  SELECT c.conname
  INTO username_unique_constraint
  FROM pg_constraint c
  JOIN pg_class t
    ON t.oid = c.conrelid
  JOIN pg_namespace n
    ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'users'
    AND c.contype = 'u'
    AND (
      SELECT COUNT(*)
      FROM unnest(c.conkey) AS key_col
    ) = 1
    AND (
      SELECT a.attname
      FROM pg_attribute a
      WHERE a.attrelid = c.conrelid
        AND a.attnum = c.conkey[1]
    ) = 'username'
  LIMIT 1;

  IF username_unique_constraint IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.users DROP CONSTRAINT %I',
      username_unique_constraint
    );
  END IF;
END $$;

DROP INDEX IF EXISTS public.users_username_key;
DROP INDEX IF EXISTS public.idx_users_username_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_username_unique
  ON public.users (tenant_id, username);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants (id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

COMMIT;
