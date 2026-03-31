import type { Request, Response } from 'express'
import * as container from '../../container.js'

function resolveActor(req: Request): { userId: string; userName: string } {
  return {
    userId: req.auth?.userId ?? 'system',
    userName: req.auth?.email ?? 'system',
  }
}

export async function getVentas(_req: Request, res: Response) {
  const data = await container.getVentasUseCase.execute()
  res.json(data)
}

export async function getVentaById(req: Request, res: Response) {
  const data = await container.getVentaByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Venta not found' })
  res.json(data)
}

export async function createVenta(req: Request, res: Response) {
  const data = await container.createVentaUseCase.execute(req.body, resolveActor(req))
  res.status(201).json(data)
}

export async function updateVenta(req: Request, res: Response) {
  const data = await container.updateVentaUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Venta not found' })
  res.json(data)
}

export async function deleteVenta(req: Request, res: Response) {
  const ok = await container.deleteVentaUseCase.execute(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Venta not found' })
  res.status(204).send()
}
