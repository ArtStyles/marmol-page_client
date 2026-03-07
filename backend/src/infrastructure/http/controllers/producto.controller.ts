import type { Request, Response } from 'express'
import * as container from '../../container.js'

export async function getProductos(_req: Request, res: Response) {
  const data = await container.getProductosUseCase.execute()
  res.json(data)
}

export async function getProductoById(req: Request, res: Response) {
  const data = await container.getProductoByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Producto not found' })
  res.json(data)
}

export async function createProducto(req: Request, res: Response) {
  const data = await container.createProductoUseCase.execute(req.body)
  res.status(201).json(data)
}

export async function updateProducto(req: Request, res: Response) {
  const data = await container.updateProductoUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Producto not found' })
  res.json(data)
}

export async function deleteProducto(req: Request, res: Response) {
  const ok = await container.deleteProductoUseCase.execute(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Producto not found' })
  res.status(204).send()
}
