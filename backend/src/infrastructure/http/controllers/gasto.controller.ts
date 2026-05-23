import type { Request, Response } from 'express'
import * as container from '../../container.js'

function resolveActor(req: Request): { userId: string; userName: string } {
  return {
    userId: req.auth?.userId ?? 'system',
    userName: req.auth?.email ?? 'system',
  }
}

export async function getGastos(_req: Request, res: Response) {
  const data = await container.getGastosUseCase.execute()
  res.json(data)
}

export async function getGastosResumen(_req: Request, res: Response) {
  const data = await container.getFinancialSummaryUseCase.execute()
  res.json(data)
}

export async function getGastoById(req: Request, res: Response) {
  const data = await container.getGastoByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Gasto not found' })
  res.json(data)
}

export async function createGasto(req: Request, res: Response) {
  const data = await container.createGastoUseCase.execute(req.body, resolveActor(req))
  res.status(201).json(data)
}

export async function updateGasto(req: Request, res: Response) {
  const data = await container.updateGastoUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Gasto not found' })
  res.json(data)
}

export async function cancelGasto(req: Request, res: Response) {
  const data = await container.cancelGastoUseCase.execute(req.params.id, req.body, resolveActor(req))
  if (!data) return res.status(404).json({ error: 'Gasto not found' })
  res.json(data)
}

export async function deleteGasto(req: Request, res: Response) {
  const ok = await container.deleteGastoUseCase.execute(req.params.id, resolveActor(req))
  if (!ok) return res.status(404).json({ error: 'Gasto not found' })
  res.status(204).send()
}

export async function getFondoActual(_req: Request, res: Response) {
  const data = await container.getFondoOperativoUseCase.execute()
  res.json(data)
}

export async function setFondoOperativo(req: Request, res: Response) {
  const data = await container.setFondoOperativoUseCase.execute(req.body, resolveActor(req))
  res.json(data)
}
