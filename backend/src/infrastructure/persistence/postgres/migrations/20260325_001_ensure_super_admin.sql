DO $$
DECLARE
  v_default_id TEXT := '{{SUPER_ADMIN_ID}}';
  v_name TEXT := '{{SUPER_ADMIN_NAME}}';
  v_email TEXT := '{{SUPER_ADMIN_EMAIL}}';
  v_workshop_id TEXT := '{{SUPER_ADMIN_WORKSHOP_ID}}';
  v_password TEXT := '{{SUPER_ADMIN_PASSWORD}}';
  v_role TEXT := '{{SUPER_ADMIN_ROLE}}';
BEGIN
  IF to_regclass('public.admin_users') IS NULL THEN
    RAISE EXCEPTION 'La tabla admin_users no existe. Ejecuta db:setup antes de db:migrate.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM admin_users
    WHERE LOWER(email) = LOWER(v_email)
  ) THEN
    RETURN;
  END IF;

  INSERT INTO admin_users (id, name, email, workshop_id, password_hash, role)
  VALUES (
    CASE
      WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = v_default_id) THEN
        'SUP-' || SUBSTRING(MD5(RANDOM()::text || CLOCK_TIMESTAMP()::text), 1, 12)
      ELSE v_default_id
    END,
    v_name,
    v_email,
    v_workshop_id,
    v_password,
    v_role
  );
END $$;
