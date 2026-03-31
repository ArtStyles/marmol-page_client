import type { Request, Response } from 'express'
import * as container from '../../container.js'

function resolveActor(req: Request): { userId: string; userName: string } {
  return {
    userId: req.auth?.userId ?? 'system',
    userName: req.auth?.email ?? 'system',
  }
}

export async function getMermas(_req: Request, res: Response) {
  const data = await container.getMermasUseCase.execute()
  res.json(data)
}

export async function getMermaById(req: Request, res: Response) {
  const data = await container.getMermaByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Merma not found' })
  res.json(data)
}

export async function createMerma(req: Request, res: Response) {
  const data = await container.createMermaUseCase.execute(req.body, resolveActor(req))
  res.status(201).json(data)
}

export async function updateMerma(req: Request, res: Response) {
  const data = await container.updateMermaUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Merma not found' })
  res.json(data)
}

export async function deleteMerma(req: Request, res: Response) {
  const ok = await container.deleteMermaUseCase.execute(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Merma not found' })
  res.status(204).send()
}
