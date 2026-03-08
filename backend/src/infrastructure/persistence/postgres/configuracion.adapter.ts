import type { ConfiguracionPort } from '../../../domain/ports/index.js'
import type { ConfiguracionSistema } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToConfig(r: Record<string, unknown>): ConfiguracionSistema {
  return {
    tarifasGlobales: r.tarifas_globales as ConfiguracionSistema['tarifasGlobales'],
    salariosFijosPorRol: r.salarios_fijos_por_rol as ConfiguracionSistema['salariosFijosPorRol'],
    preciosM2: r.precios_m2 as ConfiguracionSistema['preciosM2'],
    nombreEmpresa: r.nombre_empresa as string,
    email: r.email as string,
    telefono: r.telefono as string,
    direccion: r.direccion as string,
    notificacionesEmail: Boolean(r.notificaciones_email),
    alertasStockBajo: Boolean(r.alertas_stock_bajo),
    reportesVentas: Boolean(r.reportes_ventas),
  }
}

export class PostgresConfiguracionAdapter implements ConfiguracionPort {
  async get(): Promise<ConfiguracionSistema> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const configId = `default:${workshopId}`
    const r = await pool.query('SELECT * FROM configuracion WHERE id = $1', [configId])
    if (r.rows.length === 0) {
      const fallback = await pool.query(
        'SELECT * FROM configuracion ORDER BY updated_at DESC NULLS LAST LIMIT 1',
      )
      if (fallback.rows.length === 0) throw new Error('Configuracion not found')
      const seeded = rowToConfig(fallback.rows[0])
      await this.save(seeded)
      return seeded
    }
    return rowToConfig(r.rows[0])
  }

  async save(config: ConfiguracionSistema): Promise<ConfiguracionSistema> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const configId = `default:${workshopId}`
    await pool.query(
      `INSERT INTO configuracion (id, workshop_id, tarifas_globales, salarios_fijos_por_rol, precios_m2, nombre_empresa, email, telefono, direccion, notificaciones_email, alertas_stock_bajo, reportes_ventas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         tarifas_globales = EXCLUDED.tarifas_globales,
         salarios_fijos_por_rol = EXCLUDED.salarios_fijos_por_rol,
         precios_m2 = EXCLUDED.precios_m2,
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
        config.nombreEmpresa,
        config.email,
        config.telefono,
        config.direccion,
        config.notificacionesEmail,
        config.alertasStockBajo,
        config.reportesVentas,
      ]
    )
    return this.get()
  }
}
