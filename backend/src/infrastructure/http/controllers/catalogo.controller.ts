import type { Request, Response } from 'express'
import * as container from '../../container.js'

export async function getCatalogoItems(_req: Request, res: Response) {
  const data = await container.getCatalogoItemsUseCase.execute()
  res.json(data)
}

export async function getCatalogoItemById(req: Request, res: Response) {
  const data = await container.getCatalogoItemByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Catalogo item not found' })
  res.json(data)
}

export async function createCatalogoItem(req: Request, res: Response) {
  const data = await container.createCatalogoItemUseCase.execute(req.body)
  res.status(201).json(data)
}

export async function updateCatalogoItem(req: Request, res: Response) {
  const data = await container.updateCatalogoItemUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Catalogo item not found' })
  res.json(data)
}

export async function deleteCatalogoItem(req: Request, res: Response) {
  const ok = await container.deleteCatalogoItemUseCase.execute(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Catalogo item not found' })
  res.status(204).send()
}
