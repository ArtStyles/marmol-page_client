import type { Request, Response } from 'express'
import * as container from '../../container.js'

export async function getGastos(_req: Request, res: Response) {
  const data = await container.getGastosUseCase.execute()
  res.json(data)
}

export async function getGastoById(req: Request, res: Response) {
  const data = await container.getGastoByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Gasto not found' })
  res.json(data)
}

export async function createGasto(req: Request, res: Response) {
  const data = await container.createGastoUseCase.execute(req.body)
  res.status(201).json(data)
}

export async function updateGasto(req: Request, res: Response) {
  const data = await container.updateGastoUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Gasto not found' })
  res.json(data)
}

export async function deleteGasto(req: Request, res: Response) {
  const ok = await container.deleteGastoUseCase.execute(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Gasto not found' })
  res.status(204).send()
}
