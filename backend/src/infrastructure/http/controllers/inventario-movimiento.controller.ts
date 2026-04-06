import type { Request, Response } from 'express'
import * as container from '../../container.js'
import type { InventarioMovimientoResponseDto } from '../../../application/dtos/index.js'

function resolveActor(req: Request): { userId: string; userName: string } {
  return {
    userId: req.auth?.userId ?? 'system',
    userName: req.auth?.email ?? 'system',
  }
}

function parseLimit(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return undefined
  const integerValue = Math.trunc(parsed)
  if (integerValue <= 0) return undefined
  return integerValue
}

function parseEstado(raw: unknown): InventarioMovimientoResponseDto['estado'] | undefined {
  if (raw === 'pendiente' || raw === 'aprobado' || raw === 'rechazado') return raw
  return undefined
}

function parseCursor(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function getInventarioMovimientos(req: Request, res: Response) {
  const data = await container.getInventarioMovimientosUseCase.execute({
    limit: parseLimit(req.query.limit),
    estado: parseEstado(req.query.estado),
    cursor: parseCursor(req.query.cursor),
  })
  res.json(data)
}

export async function getInventarioMovimientoById(req: Request, res: Response) {
  const data = await container.getInventarioMovimientoByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Movimiento de inventario not found' })
  res.json(data)
}

export async function createSalidaProcesoInventario(req: Request, res: Response) {
  const data = await container.createSalidaProcesoInventarioUseCase.execute(
    req.body,
    resolveActor(req),
  )
  res.status(201).json(data)
}

export async function createRetornoProcesoInventario(req: Request, res: Response) {
  const data = await container.createRetornoProcesoInventarioUseCase.execute(
    req.body,
    resolveActor(req),
  )
  res.status(201).json(data)
}

export async function approveInventarioMovimiento(req: Request, res: Response) {
  const data = await container.approveInventarioMovimientoUseCase.execute(
    req.params.id,
    req.body,
    resolveActor(req),
  )
  res.json(data)
}

export async function rejectInventarioMovimiento(req: Request, res: Response) {
  const data = await container.rejectInventarioMovimientoUseCase.execute(
    req.params.id,
    req.body,
    resolveActor(req),
  )
  res.json(data)
}
