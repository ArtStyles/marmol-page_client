import type { Request, Response } from 'express'
import * as container from '../../container.js'

export async function getWorkshops(_req: Request, res: Response) {
  const data = await container.getWorkshopsUseCase.execute()
  res.json(data)
}

export async function getWorkshopById(req: Request, res: Response) {
  const data = await container.getWorkshopByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Workshop not found' })
  res.json(data)
}

export async function createWorkshop(req: Request, res: Response) {
  const data = await container.createWorkshopUseCase.execute(req.body)
  res.status(201).json(data)
}

export async function updateWorkshop(req: Request, res: Response) {
  const data = await container.updateWorkshopUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Workshop not found' })
  res.json(data)
}

export async function deleteWorkshop(req: Request, res: Response) {
  const ok = await container.deleteWorkshopUseCase.execute(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Workshop not found' })
  res.status(204).send()
}
