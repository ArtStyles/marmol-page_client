import type { Request, Response } from 'express'
import * as container from '../../container.js'

export async function getPermissionDefinitions(_req: Request, res: Response) {
  const data = await container.getPermissionDefinitionsUseCase.execute()
  res.json(data)
}

export async function getPermissionGroups(_req: Request, res: Response) {
  const data = await container.getPermissionGroupsUseCase.execute()
  res.json(data)
}

export async function createPermissionGroup(req: Request, res: Response) {
  const data = await container.createPermissionGroupUseCase.execute(req.body)
  res.status(201).json(data)
}

export async function updatePermissionGroup(req: Request, res: Response) {
  const data = await container.updatePermissionGroupUseCase.execute(req.params.id, req.body)
  if (!data) return res.status(404).json({ error: 'Permission group not found' })
  res.json(data)
}

export async function deletePermissionGroup(req: Request, res: Response) {
  const ok = await container.deletePermissionGroupUseCase.execute(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Permission group not found' })
  res.status(204).send()
}

export async function getUsersAccess(_req: Request, res: Response) {
  const data = await container.getUserAccessListUseCase.execute()
  res.json(data)
}

export async function updateUserAccess(req: Request, res: Response) {
  const data = await container.updateUserAccessUseCase.execute(req.params.userId, req.body)
  if (!data) return res.status(404).json({ error: 'User not found' })
  res.json(data)
}

