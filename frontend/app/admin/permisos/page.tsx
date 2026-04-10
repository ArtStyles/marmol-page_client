'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createPermissionGroup,
  deletePermissionGroup,
  getPermissionDefinitions,
  getPermissionGroups,
  getUsersAccess,
  updatePermissionGroup,
  updateUserAccess,
  type PermissionDefinition,
  type PermissionGroup,
  type UserPermissionAccess,
} from '@/lib/admin-api'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Button } from '@/components/admin/admin-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Save, ShieldPlus, Trash2 } from 'lucide-react'

type GroupFormState = {
  name: string
  description: string
  permissionCodes: Set<string>
}

type PermisosTab = 'grupos' | 'usuarios'

function toTitleCase(value: string): string {
  return value
    .split(/[_:-]/g)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function nextSet(prev: Set<string>, key: string, enabled: boolean): Set<string> {
  const next = new Set(prev)
  if (enabled) next.add(key)
  else next.delete(key)
  return next
}

function isLockedSystemGroup(group: PermissionGroup | null | undefined): boolean {
  if (!group) return false
  return group.id === 'grp_super_admin' || group.systemKey === 'role:super_admin'
}

function isLockedSuperAdminUser(user: UserPermissionAccess | null | undefined): boolean {
  return user?.role === 'Super Admin'
}

export default function PermisosPage() {
  const [sessionUser, setSessionUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)

  const [definitions, setDefinitions] = useState<PermissionDefinition[]>([])
  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [users, setUsers] = useState<UserPermissionAccess[]>([])

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<PermisosTab>('grupos')

  const [groupForm, setGroupForm] = useState<GroupFormState>({
    name: '',
    description: '',
    permissionCodes: new Set<string>(),
  })
  const [groupSubmitting, setGroupSubmitting] = useState(false)

  const [userGroupIds, setUserGroupIds] = useState<Set<string>>(new Set())
  const [userDirectPermissions, setUserDirectPermissions] = useState<Set<string>>(new Set())
  const [userSubmitting, setUserSubmitting] = useState(false)

  const canReadGroups = hasPermission(sessionUser, 'permissions:read')
  const canReadDefinitions = hasPermission(sessionUser, 'permissions:read')
  const canReadUsers = hasPermission(sessionUser, 'users:access:read')
  const canWriteGroups = hasPermission(sessionUser, 'permissions:write')
  const canWriteUsers = hasPermission(sessionUser, 'users:access:write')

  const groupedDefinitions = useMemo(() => {
    const moduleMap = new Map<string, PermissionDefinition[]>()
    for (const definition of definitions) {
      const current = moduleMap.get(definition.module) ?? []
      current.push(definition)
      moduleMap.set(definition.module, current)
    }
    return [...moduleMap.entries()]
      .map(([module, items]) => [module, items.sort((a, b) => a.name.localeCompare(b.name))] as const)
      .sort((a, b) => a[0].localeCompare(b[0]))
  }, [definitions])

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  )
  const selectedUser = useMemo(
    () => users.find((user) => user.userId === selectedUserId) ?? null,
    [users, selectedUserId],
  )
  const selectedUserIsSuperAdmin = isLockedSuperAdminUser(selectedUser)
  const selectedUserEffectivePermissions = useMemo(
    () => new Set(selectedUser?.effectivePermissionCodes ?? []),
    [selectedUser],
  )
  const selectedUserGroupPermissions = useMemo(() => {
    const inherited = new Set<string>()
    for (const groupId of userGroupIds) {
      const group = groups.find((item) => item.id === groupId)
      for (const permissionCode of group?.permissionCodes ?? []) {
        inherited.add(permissionCode)
      }
    }
    return inherited
  }, [groups, userGroupIds])
  const selectedUserVisiblePermissions = useMemo(() => {
    if (selectedUserIsSuperAdmin) return selectedUserEffectivePermissions
    if (!canReadGroups) return selectedUserEffectivePermissions
    return new Set([
      ...selectedUserGroupPermissions,
      ...userDirectPermissions,
    ])
  }, [
    canReadGroups,
    selectedUserIsSuperAdmin,
    selectedUserEffectivePermissions,
    selectedUserGroupPermissions,
    userDirectPermissions,
  ])

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Cobertura" meta="Permisos">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Permisos definidos</span>
            <span className="font-semibold">{definitions.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Grupos activos</span>
            <span className="font-semibold">{groups.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Usuarios administrables</span>
            <span className="font-semibold">{users.length}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Acceso actual" meta={sessionUser?.role ?? 'Sin sesion'}>
        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">{sessionUser?.name ?? 'Usuario no cargado'}</p>
          <p className="text-xs text-slate-500">{sessionUser?.email ?? 'Sin email'}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant={canWriteGroups ? 'default' : 'secondary'}>
              {canWriteGroups ? 'Puede crear grupos' : 'Solo lectura de grupos'}
            </Badge>
            <Badge variant={canWriteUsers ? 'default' : 'secondary'}>
              {canWriteUsers ? 'Puede asignar usuarios' : 'Sin asignacion a usuarios'}
            </Badge>
          </div>
        </div>
      </AdminPanelCard>
    </div>
  )

  const loadData = useCallback(async () => {
    if (!sessionUser) {
      setDefinitions([])
      setGroups([])
      setUsers([])
      setLoading(false)
      setSyncError(null)
      return
    }

    setLoading(true)
    setSyncError(null)
    const errors: string[] = []

    const [definitionsResult, groupsResult, usersResult] = await Promise.allSettled([
      canReadDefinitions ? getPermissionDefinitions() : Promise.resolve<PermissionDefinition[]>([]),
      canReadGroups ? getPermissionGroups() : Promise.resolve<PermissionGroup[]>([]),
      canReadUsers ? getUsersAccess() : Promise.resolve<UserPermissionAccess[]>([]),
    ])

    if (definitionsResult.status === 'fulfilled') {
      setDefinitions(definitionsResult.value)
    } else {
      setDefinitions([])
      errors.push('No se pudieron cargar las definiciones de permisos.')
    }

    if (groupsResult.status === 'fulfilled') {
      setGroups(groupsResult.value)
    } else {
      setGroups([])
      errors.push('No se pudieron cargar los grupos de permisos.')
    }

    let usersData: UserPermissionAccess[] = []
    if (usersResult.status === 'fulfilled') {
      usersData = usersResult.value
      setUsers(usersData)
    } else {
      setUsers([])
      errors.push('No se pudieron cargar los accesos de usuarios.')
    }

    setSelectedUserId((previousUserId) => {
      if (previousUserId && usersData.some((user) => user.userId === previousUserId)) {
        return previousUserId
      }
      return usersData[0]?.userId ?? null
    })

    if (errors.length > 0) {
      setSyncError(errors.join(' '))
    }
    setLoading(false)
  }, [canReadDefinitions, canReadGroups, canReadUsers, sessionUser])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    if (!raw) {
      setLoading(false)
      return
    }
    try {
      setSessionUser(JSON.parse(raw) as AdminUser)
    } catch {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!sessionUser) return
    void loadData()
  }, [loadData, sessionUser])

  useEffect(() => {
    if (!selectedGroup) {
      setGroupForm({
        name: '',
        description: '',
        permissionCodes: new Set(),
      })
      return
    }
    setGroupForm({
      name: selectedGroup.name,
      description: selectedGroup.description ?? '',
      permissionCodes: new Set(selectedGroup.permissionCodes),
    })
  }, [selectedGroup])

  useEffect(() => {
    if (!selectedUser) {
      setUserGroupIds(new Set())
      setUserDirectPermissions(new Set())
      return
    }
    setUserGroupIds(new Set(selectedUser.permissionGroupIds))
    setUserDirectPermissions(new Set(selectedUser.directPermissionCodes))
  }, [selectedUser])

  const handleResetGroup = () => {
    setSelectedGroupId(null)
    setGroupForm({
      name: '',
      description: '',
      permissionCodes: new Set(),
    })
  }

  const handleSaveGroup = async () => {
    if (!canWriteGroups) return
    const payload = {
      name: groupForm.name.trim(),
      description: groupForm.description.trim(),
      permissionCodes: [...groupForm.permissionCodes].sort((a, b) => a.localeCompare(b)),
    }
    if (!payload.name || payload.permissionCodes.length === 0) {
      setSyncError('El grupo requiere nombre y al menos un permiso.')
      return
    }
    if (isLockedSystemGroup(selectedGroup)) {
      setSyncError('El grupo Super Admin no se puede editar desde esta vista.')
      return
    }

    setGroupSubmitting(true)
    setSyncError(null)
    try {
      if (selectedGroupId) {
        await updatePermissionGroup(selectedGroupId, payload)
      } else {
        await createPermissionGroup(payload)
      }
      await loadData()
      handleResetGroup()
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'No se pudo guardar el grupo.')
    } finally {
      setGroupSubmitting(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!canWriteGroups || !selectedGroupId) return
    if (isLockedSystemGroup(selectedGroup)) {
      setSyncError('El grupo Super Admin no se puede eliminar.')
      return
    }
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Eliminar este grupo de permisos?')
      if (!confirmed) return
    }

    setGroupSubmitting(true)
    setSyncError(null)
    try {
      await deletePermissionGroup(selectedGroupId)
      await loadData()
      handleResetGroup()
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'No se pudo eliminar el grupo.')
    } finally {
      setGroupSubmitting(false)
    }
  }

  const handleSaveUserAccess = async () => {
    if (!canWriteUsers || !selectedUser) return
    if (selectedUserIsSuperAdmin) {
      setSyncError('El acceso del Super Admin esta gestionado por el sistema y no se puede editar.')
      return
    }
    setUserSubmitting(true)
    setSyncError(null)
    try {
      await updateUserAccess(selectedUser.userId, {
        permissionGroupIds: [...userGroupIds].sort((a, b) => a.localeCompare(b)),
        directPermissionCodes: [...userDirectPermissions].sort((a, b) => a.localeCompare(b)),
      })
      await loadData()
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'No se pudo actualizar acceso del usuario.')
    } finally {
      setUserSubmitting(false)
    }
  }

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
        <div className="rounded-[24px] border border-white/60 bg-white/70 p-5 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-slate-900">Permisos y Accesos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Crea grupos de permisos y asigna acceso granular por usuario.
          </p>
          {syncError ? <p className="mt-2 text-sm text-destructive">{syncError}</p> : null}
        </div>

        {loading ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Cargando permisos...
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PermisosTab)} className="space-y-4">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-white/60 bg-white/70 p-2">
              <TabsTrigger value="grupos" className="h-10 flex-none rounded-xl px-4">
                Grupos de permisos
              </TabsTrigger>
              <TabsTrigger value="usuarios" className="h-10 flex-none rounded-xl px-4">
                Asignacion por usuario
              </TabsTrigger>
            </TabsList>
            <TabsContent value="grupos">
              <Card className="border-white/60 bg-white/80 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.4)]">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">Grupos de permisos</CardTitle>
                <p className="text-xs text-slate-500">
                  Puedes editar grupos del sistema, excepto Super Admin.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`rounded-xl border px-3 py-2 text-left transition ${
                        selectedGroupId === group.id
                          ? 'border-slate-900/30 bg-slate-100'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">{group.name}</p>
                        {group.isSystem ? <Badge variant="secondary">Sistema</Badge> : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {(group.permissionCodes?.length ?? 0)} permisos · {group.memberCount ?? 0} usuarios
                      </p>
                    </button>
                  ))}
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="space-y-2">
                    <Label>Nombre del grupo</Label>
                    <Input
                      value={groupForm.name}
                      onChange={(event) =>
                        setGroupForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      disabled={isLockedSystemGroup(selectedGroup)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripcion</Label>
                    <Textarea
                      value={groupForm.description}
                      onChange={(event) =>
                        setGroupForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      rows={3}
                      disabled={isLockedSystemGroup(selectedGroup)}
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Permisos del grupo
                    </p>
                    {groupedDefinitions.map(([module, items]) => (
                      <div key={module} className="rounded-lg border border-slate-200 bg-white p-2">
                        <p className="mb-2 text-xs font-semibold text-slate-700">{toTitleCase(module)}</p>
                        <div className="space-y-2">
                          {items.map((definition) => (
                            <label
                              key={definition.code}
                              className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-slate-50"
                            >
                              <Checkbox
                                checked={groupForm.permissionCodes.has(definition.code)}
                                onCheckedChange={(checked) =>
                                  setGroupForm((prev) => ({
                                    ...prev,
                                    permissionCodes: nextSet(
                                      prev.permissionCodes,
                                      definition.code,
                                      checked === true,
                                    ),
                                  }))
                                }
                                disabled={isLockedSystemGroup(selectedGroup)}
                              />
                              <span>
                                <span className="block text-sm text-slate-900">{definition.name}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={handleResetGroup}>
                      Nuevo grupo
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveGroup}
                      disabled={
                        !canWriteGroups || isLockedSystemGroup(selectedGroup) || groupSubmitting
                      }
                    >
                      <ShieldPlus className="mr-2 h-4 w-4" />
                      {selectedGroupId ? 'Guardar cambios' : 'Crear grupo'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDeleteGroup}
                      disabled={
                        !canWriteGroups ||
                        !selectedGroupId ||
                        isLockedSystemGroup(selectedGroup) ||
                        groupSubmitting
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar grupo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            </TabsContent>

            <TabsContent value="usuarios">
              <Card className="border-white/60 bg-white/80 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.4)]">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">Asignacion por usuario</CardTitle>
                <p className="text-xs text-slate-500">
                  Combina grupos con permisos directos para casos especiales.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Usuario</Label>
                  <select
                    value={selectedUserId ?? ''}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  >
                    {users.length === 0 ? (
                      <option value="" disabled>
                        No hay usuarios disponibles
                      </option>
                    ) : null}
                    {users.map((user) => (
                      <option key={user.userId} value={user.userId}>
                        {user.name} · {user.role}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedUser ? (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-sm font-semibold text-slate-900">{selectedUser.name}</p>
                      <p className="text-xs text-slate-500">{selectedUser.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Taller: {selectedUser.workshopId} · Rol base: {selectedUser.role}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Grupos asignados
                      </p>
                      {selectedUserIsSuperAdmin ? (
                        <p className="text-[11px] text-amber-700">
                          Super Admin siempre conserva acceso total. Esta configuracion es de solo lectura.
                        </p>
                      ) : null}
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                        {groups.map((group) => (
                          <label key={group.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50">
                            <Checkbox
                              checked={userGroupIds.has(group.id)}
                              onCheckedChange={(checked) =>
                                setUserGroupIds((prev) => nextSet(prev, group.id, checked === true))
                              }
                              disabled={!canWriteUsers || selectedUserIsSuperAdmin}
                            />
                            <span className="text-sm text-slate-800">
                              {group.name}
                              {group.isSystem ? ' (sistema)' : ''}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {selectedUserIsSuperAdmin ? 'Permisos efectivos (sistema)' : 'Permisos directos'}
                      </p>
                      {!selectedUserIsSuperAdmin ? (
                        <p className="text-[11px] text-slate-500">
                          Los permisos heredados por grupo aparecen marcados y son de solo lectura aqui.
                        </p>
                      ) : null}
                      {groupedDefinitions.map(([module, items]) => (
                        <div key={module} className="rounded-lg border border-slate-200 bg-white p-2">
                          <p className="mb-2 text-xs font-semibold text-slate-700">{toTitleCase(module)}</p>
                          <div className="space-y-2">
                            {items.map((definition) => (
                              <label
                                key={definition.code}
                                className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-slate-50"
                              >
                                <Checkbox
                                  checked={selectedUserVisiblePermissions.has(definition.code)}
                                  onCheckedChange={(checked) => {
                                    if (selectedUserGroupPermissions.has(definition.code)) return
                                    setUserDirectPermissions((prev) =>
                                      nextSet(prev, definition.code, checked === true),
                                    )
                                  }}
                                  disabled={
                                    !canWriteUsers ||
                                    selectedUserIsSuperAdmin ||
                                    selectedUserGroupPermissions.has(definition.code)
                                  }
                                />
                                <span>
                                  <span className="block text-sm text-slate-900">{definition.name}</span>
                                  {!selectedUserIsSuperAdmin &&
                                  selectedUserGroupPermissions.has(definition.code) ? (
                                    <span className="block text-[11px] text-amber-700">
                                      Heredado por grupo
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      onClick={handleSaveUserAccess}
                      disabled={!canWriteUsers || userSubmitting || selectedUserIsSuperAdmin}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Guardar acceso del usuario
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                    No hay usuario seleccionado.
                  </div>
                )}
              </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminShell>
  )
}
