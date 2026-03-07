import type { Request, Response } from 'express'
import * as container from '../../container.js'

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
  const data = await container.createVentaUseCase.execute(req.body)
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
