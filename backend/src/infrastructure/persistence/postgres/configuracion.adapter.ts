import type { ConfiguracionPort } from '../../../domain/ports/index.js'
import type { ConfiguracionSistema } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { getCurrentWorkshopId } from './tenant.js'

const emptyConfiguracion: ConfiguracionSistema = {
  tarifasGlobales: {
    picar: 0,
    escuadrar: 0,
    devastar: 0,
    resinar: 0,
    pulir: 0,
  },
  salariosFijosPorRol: {
    Administrador: 0,
    'Gestor de Ventas': 0,
    'Jefe de Almacen': 0,
    'Jefe de Turno de Producci\u00f3n': 0,
  },
  preciosM2: {
    '40x40': { crudo: 0, pulido: 0 },
    '60x40': { crudo: 0, pulido: 0 },
    '80x40': { crudo: 0, pulido: 0 },
    '160x60': { crudo: 0, pulido: 0 },
    '160x65': { crudo: 0, pulido: 0 },
  },
  monoHiloGrosorDiscoMm: 8,
  monoHiloEspesorLosaCm: 3,
  nombreEmpresa: '',
  email: '',
  telefono: '',
  direccion: '',
  notificacionesEmail: false,
  alertasStockBajo: false,
  reportesVentas: false,
}

function rowToConfig(r: Record<string, unknown>): ConfiguracionSistema {
  return {
    tarifasGlobales: r.tarifas_globales as ConfiguracionSistema['tarifasGlobales'],
    salariosFijosPorRol: r.salarios_fijos_por_rol as ConfiguracionSistema['salariosFijosPorRol'],
    preciosM2: r.precios_m2 as ConfiguracionSistema['preciosM2'],
    monoHiloGrosorDiscoMm: Number(r.mono_hilo_grosor_disco_mm ?? emptyConfiguracion.monoHiloGrosorDiscoMm),
    monoHiloEspesorLosaCm: Number(r.mono_hilo_espesor_losa_cm ?? emptyConfiguracion.monoHiloEspesorLosaCm),
    nombreEmpresa: r.nombre_empresa as string,
    email: r.email as string,
    telefono: r.telefono as string,
    direccion: r.direccion as string,
    notificacionesEmail: Boolean(r.notificaciones_email),
    alertasStockBajo: Boolean(r.alertas_stock_bajo),
    reportesVentas: Boolean(r.reportes_ventas),
  }
}

function applyWorkshopCompanyInfo(
  config: ConfiguracionSistema,
  workshopRow: Record<string, unknown> | null,
): ConfiguracionSistema {
  if (!workshopRow) return config

  return {
    ...config,
    nombreEmpresa: (workshopRow.nombre as string) ?? '',
    email: (workshopRow.correo as string) ?? '',
    telefono: (workshopRow.telefono as string) ?? '',
    direccion: (workshopRow.direccion as string) ?? '',
  }
}

export class PostgresConfiguracionAdapter implements ConfiguracionPort {
  private async upsertConfig(
    workshopId: string,
    config: ConfiguracionSistema,
    options: { syncWorkshopCompanyInfo: boolean },
  ): Promise<void> {
    const pool = getPool()
    const configId = `default:${workshopId}`

    await pool.query(
      `INSERT INTO configuracion (id, workshop_id, tarifas_globales, salarios_fijos_por_rol, precios_m2, mono_hilo_grosor_disco_mm, mono_hilo_espesor_losa_cm, nombre_empresa, email, telefono, direccion, notificaciones_email, alertas_stock_bajo, reportes_ventas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         tarifas_globales = EXCLUDED.tarifas_globales,
         salarios_fijos_por_rol = EXCLUDED.salarios_fijos_por_rol,
         precios_m2 = EXCLUDED.precios_m2,
         mono_hilo_grosor_disco_mm = EXCLUDED.mono_hilo_grosor_disco_mm,
         mono_hilo_espesor_losa_cm = EXCLUDED.mono_hilo_espesor_losa_cm,
         nombre_empresa = EXCLUDED.nombre_empresa,
         email = EXCLUDED.email,
         telefono = EXCLUDED.telefono,
         direccion = EXCLUDED.direccion,
         notificaciones_email = EXCLUDED.notificaciones_email,
         alertas_stock_bajo = EXCLUDED.alertas_stock_bajo,
         reportes_ventas = EXCLUDED.reportes_ventas,
         updated_at = NOW()`,
      [
        configId,
        workshopId,
        JSON.stringify(config.tarifasGlobales),
        JSON.stringify(config.salariosFijosPorRol),
        JSON.stringify(config.preciosM2),
        config.monoHiloGrosorDiscoMm,
        config.monoHiloEspesorLosaCm,
        config.nombreEmpresa,
        config.email,
        config.telefono,
        config.direccion,
        config.notificacionesEmail,
        config.alertasStockBajo,
        config.reportesVentas,
      ],
    )

    if (!options.syncWorkshopCompanyInfo) return

    await pool.query(
      `UPDATE workshops
       SET nombre = $2, correo = $3, telefono = $4, direccion = $5
       WHERE id = $1`,
      [workshopId, config.nombreEmpresa, config.email, config.telefono, config.direccion],
    )
  }

  async get(): Promise<ConfiguracionSistema> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const configId = `default:${workshopId}`
    let configRows = await pool.query('SELECT * FROM configuracion WHERE id = $1', [configId])
    if (configRows.rows.length === 0) {
      await this.upsertConfig(workshopId, emptyConfiguracion, {
        syncWorkshopCompanyInfo: false,
      })
      configRows = await pool.query('SELECT * FROM configuracion WHERE id = $1', [configId])
    }

    if (configRows.rows.length === 0) return emptyConfiguracion

    const workshopRows = await pool.query(
      'SELECT nombre, correo, telefono, direccion FROM workshops WHERE id = $1 LIMIT 1',
      [workshopId],
    )

    const config = rowToConfig(configRows.rows[0] as Record<string, unknown>)
    const workshop =
      workshopRows.rows.length > 0 ? (workshopRows.rows[0] as Record<string, unknown>) : null

    return applyWorkshopCompanyInfo(config, workshop)
  }

  async save(config: ConfiguracionSistema): Promise<ConfiguracionSistema> {
    const workshopId = getCurrentWorkshopId()
    await this.upsertConfig(workshopId, config, {
      syncWorkshopCompanyInfo: true,
    })
    return this.get()
  }
}


