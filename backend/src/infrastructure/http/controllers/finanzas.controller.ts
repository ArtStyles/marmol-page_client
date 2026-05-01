import type { Request, Response } from 'express'
import * as container from '../../container.js'

export async function getFinancialSummary(_req: Request, res: Response) {
  const data = await container.getFinancialSummaryUseCase.execute()
  res.json(data)
}
