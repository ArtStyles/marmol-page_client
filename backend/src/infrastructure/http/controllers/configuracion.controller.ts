import type { Request, Response } from 'express'
import * as container from '../../container.js'

export async function getConfiguracion(_req: Request, res: Response) {
  const data = await container.getConfiguracionUseCase.execute()
  res.json(data)
}

export async function updateConfiguracion(req: Request, res: Response) {
  const data = await container.updateConfiguracionUseCase.execute(req.body)
  res.json(data)
}
