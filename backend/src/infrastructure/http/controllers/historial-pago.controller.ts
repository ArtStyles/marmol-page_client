import type { Request, Response } from 'express'
import * as container from '../../container.js'

function resolveActor(req: Request): { userId: string; userName: string } {
  return {
    userId: req.auth?.userId ?? 'system',
    userName: req.auth?.email ?? 'system',
  }
}

export async function getHistorialPagos(_req: Request, res: Response) {
  const data = await container.getHistorialPagosUseCase.execute()
  res.json(data)
}

export async function getHistorialPagoById(req: Request, res: Response) {
  const data = await container.getHistorialPagoByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Historial pago not found' })
  res.json(data)
}

export async function createHistorialPago(req: Request, res: Response) {
  const data = await container.createHistorialPagoUseCase.execute(req.body, resolveActor(req))
  res.status(201).json(data)
}

export async function updateHistorialPago(req: Request, res: Response) {
  const data = await container.updateHistorialPagoUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Historial pago not found' })
  res.json(data)
}

export async function deleteHistorialPago(req: Request, res: Response) {
  const ok = await container.deleteHistorialPagoUseCase.execute(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Historial pago not found' })
  res.status(204).send()
}
