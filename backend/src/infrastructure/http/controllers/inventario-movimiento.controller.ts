import type { Request, Response } from 'express'
import * as container from '../../container.js'

function resolveActor(req: Request): { userId: string; userName: string } {
  return {
    userId: req.auth?.userId ?? 'system',
    userName: req.auth?.email ?? 'system',
  }
}

export async function getInventarioMovimientos(_req: Request, res: Response) {
  const data = await container.getInventarioMovimientosUseCase.execute()
  res.json(data)
}

export async function getInventarioMovimientoById(req: Request, res: Response) {
  const data = await container.getInventarioMovimientoByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Movimiento de inventario not found' })
  res.json(data)
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
