-- Parametros tecnicos de mono hilo movidos a configuracion global del taller.

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS mono_hilo_grosor_disco_mm NUMERIC(10,2) NOT NULL DEFAULT 8;

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS mono_hilo_espesor_losa_cm NUMERIC(10,2) NOT NULL DEFAULT 3;
