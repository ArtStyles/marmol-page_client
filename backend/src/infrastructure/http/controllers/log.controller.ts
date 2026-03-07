import type { Request, Response } from 'express'
import * as container from '../../container.js'

export async function getLogs(_req: Request, res: Response) {
  const data = await container.getLogsUseCase.execute()
  res.json(data)
}

export async function createLog(req: Request, res: Response) {
  const data = await container.createLogUseCase.execute(req.body)
  res.status(201).json(data)
}
