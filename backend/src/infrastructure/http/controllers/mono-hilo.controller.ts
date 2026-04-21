import type { Request, Response } from 'express'
import * as container from '../../container.js'

function resolveActor(req: Request): { userId: string; userName: string } {
  return {
    userId: req.auth?.userId ?? 'system',
    userName: req.auth?.email ?? 'system',
  }
}

export async function getMonoHiloMasas(_req: Request, res: Response) {
  const data = await container.getMonoHiloMasasUseCase.execute()
  res.json(data)
}

export async function createMonoHiloMasas(req: Request, res: Response) {
  const data = await container.createMonoHiloMasasUseCase.execute(req.body, resolveActor(req))
  res.status(201).json(data)
}

export async function registerMonoHiloProduccion(req: Request, res: Response) {
  const data = await container.registerMonoHiloProduccionUseCase.execute(req.body, resolveActor(req))
  res.status(201).json(data)
}

export async function updateMonoHiloMasaUbicacion(req: Request, res: Response) {
  const data = await container.updateMonoHiloMasaUbicacionUseCase.execute(req.params.id, req.body)
  res.json(data)
}
