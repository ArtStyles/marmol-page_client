import type { Request, Response } from 'express'
import * as container from '../../container.js'

export async function login(req: Request, res: Response) {
  const result = await container.loginUseCase.execute(req.body)
  if (!result) return res.status(401).json({ error: 'Invalid credentials' })
  res.json(result)
}
