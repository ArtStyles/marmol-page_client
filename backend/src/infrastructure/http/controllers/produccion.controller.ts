import type { Request, Response } from 'express'
import * as container from '../../container.js'

function resolveActor(req: Request): { userId: string; userName: string } {
  return {
    userId: req.auth?.userId ?? 'system',
    userName: req.auth?.email ?? 'system',
  }
}

export async function getProduccion(_req: Request, res: Response) {
  const data = await container.getProduccionUseCase.execute()
  res.json(data)
}

export async function getProduccionById(req: Request, res: Response) {
  const data = await container.getProduccionByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Produccion not found' })
  res.json(data)
}

export async function createProduccion(req: Request, res: Response) {
  const data = await container.createProduccionUseCase.execute(req.body, resolveActor(req))
  res.status(201).json(data)
}

export async function approveProduccionTaller(req: Request, res: Response) {
  const data = await container.approveProduccionTallerUseCase.execute(
    req.params.id,
    req.body,
    resolveActor(req),
  )
  res.json(data)
}

export async function approveProduccionAlmacen(req: Request, res: Response) {
  const data = await container.approveEntradaProduccionAlmacenUseCase.execute(
    req.params.id,
    req.body,
    resolveActor(req),
  )
  res.json(data)
}

export async function cancelMonoHiloProduccion(req: Request, res: Response) {
  const data = await container.cancelMonoHiloProduccionUseCase.execute(
    req.params.id,
    req.body,
    resolveActor(req),
  )
  res.json(data)
}

export async function updateProduccion(req: Request, res: Response) {
  const data = await container.updateProduccionUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Produccion not found' })
  res.json(data)
}

export async function deleteProduccion(req: Request, res: Response) {
  const ok = await container.deleteProduccionUseCase.execute(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Produccion not found' })
  res.status(204).send()
}

export async function getProduccionTrabajadores(_req: Request, res: Response) {
  const data = await container.getProduccionTrabajadoresUseCase.execute()
  res.json(data)
}

export async function getProduccionTrabajadorById(req: Request, res: Response) {
  const data = await container.getProduccionTrabajadorByIdUseCase.execute(req.params.id)
  if (!data) return res.status(404).json({ error: 'Produccion trabajador not found' })
  res.json(data)
}

export async function createProduccionTrabajador(req: Request, res: Response) {
  const data = await container.createProduccionTrabajadorUseCase.execute(req.body)
  res.status(201).json(data)
}

export async function updateProduccionTrabajador(req: Request, res: Response) {
  const data = await container.updateProduccionTrabajadorUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Produccion trabajador not found' })
  res.json(data)
}

export async function deleteProduccionTrabajador(req: Request, res: Response) {
  const ok = await container.deleteProduccionTrabajadorUseCase.execute(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Produccion trabajador not found' })
  res.status(204).send()
}
