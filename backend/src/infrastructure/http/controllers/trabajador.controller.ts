import type { Request, Response } from 'express'
import * as container from '../../container.js'

export async function getTrabajadores(_req: Request, res: Response) {
  const data = await container.getTrabajadoresUseCase.execute()
  res.json(data)
}

export async function getTrabajadorById(req: Request, res: Response) {
  const data = await container.getTrabajadorByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Trabajador not found' })
  res.json(data)
}

export async function createTrabajador(req: Request, res: Response) {
  const data = await container.createTrabajadorUseCase.execute(req.body)
  res.status(201).json(data)
}

export async function updateTrabajador(req: Request, res: Response) {
  const data = await container.updateTrabajadorUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Trabajador not found' })
  res.json(data)
}

export async function deleteTrabajador(req: Request, res: Response) {
  const ok = await container.deleteTrabajadorUseCase.execute(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Trabajador not found' })
  res.status(204).send()
}
