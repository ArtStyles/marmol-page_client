import type { BloqueOLote } from './types'

type BloqueConCodigo = Pick<BloqueOLote, 'id'> &
  Partial<Pick<BloqueOLote, 'nombre' | 'codigo'>>

export function getBloqueCodigo(bloque: BloqueConCodigo): string {
  const codigo = typeof bloque.codigo === 'string' ? bloque.codigo.trim() : ''
  if (codigo) return codigo

  const nombre = typeof bloque.nombre === 'string' ? bloque.nombre.trim() : ''
  if (nombre) return nombre

  return bloque.id
}
