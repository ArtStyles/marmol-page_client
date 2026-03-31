-- Garantiza que Super Admin tenga siempre todos los permisos existentes y futuros.

DO $$
DECLARE
  v_super_group_id TEXT;
BEGIN
  IF to_regclass('public.admin_permission_groups') IS NULL
    OR to_regclass('public.admin_permission_definitions') IS NULL
    OR to_regclass('public.admin_permission_group_permissions') IS NULL
    OR to_regclass('public.admin_users') IS NULL
    OR to_regclass('public.admin_user_permission_groups') IS NULL THEN
    RAISE EXCEPTION 'Faltan tablas del sistema de permisos. Ejecuta la migracion 20260326_002_permissions_model.sql antes de esta.';
  END IF;

  SELECT id
  INTO v_super_group_id
  FROM admin_permission_groups
  WHERE system_key = 'role:super_admin'
  LIMIT 1;

  IF v_super_group_id IS NULL THEN
    INSERT INTO admin_permission_groups (id, name, description, is_system, system_key)
    VALUES (
      'grp_super_admin',
      'Super Admin',
      'Acceso total a todos los modulos y alcance multi-taller.',
      true,
      'role:super_admin'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_system = true,
      system_key = EXCLUDED.system_key
    RETURNING id INTO v_super_group_id;
  ELSE
    UPDATE admin_permission_groups
    SET
      name = 'Super Admin',
      description = 'Acceso total a todos los modulos y alcance multi-taller.',
      is_system = true,
      system_key = 'role:super_admin'
    WHERE id = v_super_group_id;
  END IF;

  INSERT INTO admin_permission_group_permissions (group_id, permission_code)
  SELECT v_super_group_id, pd.code
  FROM admin_permission_definitions pd
  ON CONFLICT DO NOTHING;

  INSERT INTO admin_user_permission_groups (user_id, group_id)
  SELECT u.id, v_super_group_id
  FROM admin_users u
  WHERE u.role = 'Super Admin'
  ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION admin_sync_new_permission_to_super_admin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_super_group_id TEXT;
BEGIN
  SELECT id
  INTO v_super_group_id
  FROM admin_permission_groups
  WHERE system_key = 'role:super_admin'
  LIMIT 1;

  IF v_super_group_id IS NULL THEN
    INSERT INTO admin_permission_groups (id, name, description, is_system, system_key)
    VALUES (
      'grp_super_admin',
      'Super Admin',
      'Acceso total a todos los modulos y alcance multi-taller.',
      true,
      'role:super_admin'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_system = true,
      system_key = EXCLUDED.system_key
    RETURNING id INTO v_super_group_id;
  END IF;

  INSERT INTO admin_permission_group_permissions (group_id, permission_code)
  VALUES (v_super_group_id, NEW.code)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_admin_permission_definitions_super_admin_sync ON admin_permission_definitions;
CREATE TRIGGER trg_admin_permission_definitions_super_admin_sync
AFTER INSERT ON admin_permission_definitions
FOR EACH ROW
EXECUTE FUNCTION admin_sync_new_permission_to_super_admin();

CREATE OR REPLACE FUNCTION admin_sync_super_admin_user_group()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_super_group_id TEXT;
BEGIN
  SELECT id
  INTO v_super_group_id
  FROM admin_permission_groups
  WHERE system_key = 'role:super_admin'
  LIMIT 1;

  IF v_super_group_id IS NULL THEN
    INSERT INTO admin_permission_groups (id, name, description, is_system, system_key)
    VALUES (
      'grp_super_admin',
      'Super Admin',
      'Acceso total a todos los modulos y alcance multi-taller.',
      true,
      'role:super_admin'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_system = true,
      system_key = EXCLUDED.system_key
    RETURNING id INTO v_super_group_id;
  END IF;

  IF NEW.role = 'Super Admin' THEN
    INSERT INTO admin_user_permission_groups (user_id, group_id)
    VALUES (NEW.id, v_super_group_id)
    ON CONFLICT DO NOTHING;
  ELSIF TG_OP = 'UPDATE' AND OLD.role = 'Super Admin' AND NEW.role <> 'Super Admin' THEN
    DELETE FROM admin_user_permission_groups
    WHERE user_id = NEW.id
      AND group_id = v_super_group_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_admin_users_super_admin_group_sync ON admin_users;
CREATE TRIGGER trg_admin_users_super_admin_group_sync
AFTER INSERT OR UPDATE OF role ON admin_users
FOR EACH ROW
EXECUTE FUNCTION admin_sync_super_admin_user_group();
