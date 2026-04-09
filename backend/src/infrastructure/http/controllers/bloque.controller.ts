import type { Request, Response } from 'express'
import * as container from '../../container.js'

function resolveActor(req: Request): { userId: string; userName: string } {
  return {
    userId: req.auth?.userId ?? 'system',
    userName: req.auth?.email ?? 'system',
  }
}

export async function getBloques(_req: Request, res: Response) {
  const data = await container.getBloquesUseCase.execute()
  res.json(data)
}

export async function getBloqueById(req: Request, res: Response) {
  const id = req.params.id
  const data = await container.getBloqueByIdUseCase.execute(id)
  if (!data) return res.status(404).json({ error: 'Bloque not found' })
  res.json(data)
}

export async function createBloque(req: Request, res: Response) {
  const data = await container.createBloqueUseCase.execute(req.body, resolveActor(req))
  res.status(201).json(data)
}

export async function updateBloque(req: Request, res: Response) {
  const id = req.params.id
  const data = await container.updateBloqueUseCase.execute(id, req.body)
  if (!data) return res.status(404).json({ error: 'Bloque not found' })
  res.json(data)
}

export async function deleteBloque(req: Request, res: Response) {
  const id = req.params.id
  const ok = await container.deleteBloqueUseCase.execute(id)
  if (!ok) return res.status(404).json({ error: 'Bloque not found' })
  res.status(204).send()
}
