import type { Request, Response } from 'express'
import * as container from '../../container.js'

export async function getMonoHiloMasas(_req: Request, res: Response) {
  const data = await container.getMonoHiloMasasUseCase.execute()
  res.json(data)
}

export async function createMonoHiloMasas(req: Request, res: Response) {
  const data = await container.createMonoHiloMasasUseCase.execute(req.body)
  res.status(201).json(data)
}

export async function registerMonoHiloProduccion(req: Request, res: Response) {
  const data = await container.registerMonoHiloProduccionUseCase.execute(req.body)
  res.status(201).json(data)
}

export async function updateMonoHiloMasaUbicacion(req: Request, res: Response) {
  const data = await container.updateMonoHiloMasaUbicacionUseCase.execute(req.params.id, req.body)
  res.json(data)
}
