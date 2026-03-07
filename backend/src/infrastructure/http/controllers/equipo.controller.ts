import type { Request, Response } from 'express'
import * as container from '../../container.js'

export async function getEquipos(_req: Request, res: Response) {
  const data = await container.getEquiposUseCase.execute()
  res.json(data)
}

export async function getEquipoById(req: Request, res: Response) {
  const data = await container.getEquipoByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Equipo not found' })
  res.json(data)
}

export async function createEquipo(req: Request, res: Response) {
  const data = await container.createEquipoUseCase.execute(req.body)
  res.status(201).json(data)
}

export async function updateEquipo(req: Request, res: Response) {
  const data = await container.updateEquipoUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Equipo not found' })
  res.json(data)
}

export async function deleteEquipo(req: Request, res: Response) {
  const ok = await container.deleteEquipoUseCase.execute(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Equipo not found' })
  res.status(204).send()
}
