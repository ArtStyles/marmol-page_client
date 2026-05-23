-- Actualiza categorías manuales de gastos al modelo operativo del taller.
-- Renombra: Operacion → Operativo, Imprevisto → Otros
-- Agrega: Personal
-- Mantiene sistema: Materia prima, Transporte, Nomina (auto-generados desde otros módulos)

BEGIN;

-- Migrar datos existentes antes de cambiar el constraint
UPDATE gastos SET tipo = 'Operativo' WHERE tipo = 'Operacion';
UPDATE gastos SET tipo = 'Otros'     WHERE tipo = 'Imprevisto';

-- Reemplazar constraint de tipo
ALTER TABLE gastos DROP CONSTRAINT IF EXISTS gastos_tipo_check;

ALTER TABLE gastos
  ADD CONSTRAINT gastos_tipo_check CHECK (
    tipo IN (
      'Materia prima',
      'Transporte',
      'Servicios',
      'Mantenimiento',
      'Nomina',
      'Operativo',
      'Personal',
      'Otros'
    )
  );

COMMIT;
