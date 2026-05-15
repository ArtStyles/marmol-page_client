'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/admin/admin-button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useConfiguracion } from '@/hooks/use-configuracion'
import { useInventarioStore } from '@/hooks/use-inventario'
import { useProduccionStore } from '@/hooks/use-produccion'
import { getBloqueCodigo } from '@/lib/bloque-codigo'
import {
  getGastos,
  getMermas,
  getMonoHiloMasas,
  getProduccionTrabajadores,
  getVentas,
} from '@/lib/resources-api'
import type {
  BloqueOLote,
  Gasto,
  Merma,
  MonoHiloMasa,
  ProduccionTrabajador,
  Venta,
} from '@/lib/types'
import { InventoryOriginDetailDialog } from '@/app/admin/inventario/feature/components/inventory-origin-detail-dialog'
import { buildInventoryOriginProfiles } from '@/app/admin/inventario/feature/lib/inventory-origin-profiles'

type BloquesTrazabilidadSectionProps = {
  blocks: BloqueOLote[]
  canReadVentas: boolean
  searchTerm: string
}

export function BloquesTrazabilidadSection({
  blocks,
  canReadVentas,
  searchTerm,
}: BloquesTrazabilidadSectionProps) {
  const { productos } = useInventarioStore()
  const { produccion } = useProduccionStore()
  const { config } = useConfiguracion()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [mermas, setMermas] = useState<Merma[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [produccionTrabajadores, setProduccionTrabajadores] = useState<ProduccionTrabajador[]>([])
  const [monoHiloMasas, setMonoHiloMasas] = useState<MonoHiloMasa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOriginId, setSelectedOriginId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [gastosData, mermasData, produccionTrabajadoresData, monoHiloMasasData, ventasData] =
          await Promise.all([
            getGastos(),
            getMermas(),
            getProduccionTrabajadores(),
            getMonoHiloMasas(),
            canReadVentas ? getVentas() : Promise.resolve([]),
          ])

        if (!alive) return
        setGastos(gastosData)
        setMermas(mermasData)
        setProduccionTrabajadores(produccionTrabajadoresData)
        setMonoHiloMasas(monoHiloMasasData)
        setVentas(ventasData)
      } catch (loadError) {
        if (!alive) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar la trazabilidad operativa de bloques.',
        )
        setGastos([])
        setMermas([])
        setProduccionTrabajadores([])
        setMonoHiloMasas([])
        setVentas([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [canReadVentas])

  const resolveOriginCode = (originId: string, originName: string): string => {
    const block = blocks.find((item) => item.id.trim() === originId.trim())
    if (block) return getBloqueCodigo(block)
    return originName.trim() || 'SIN-CODIGO'
  }

  const originProfiles = useMemo(
    () =>
      buildInventoryOriginProfiles({
        blocks,
        allProducts: productos,
        visibleProducts: productos,
        gastos,
        mermas,
        produccion,
        produccionTrabajadores,
        monoHiloMasas,
        ventas,
        config: {
          costosAnalisisEstado: config.costosAnalisisEstado,
          costoResinaLitro: config.costoResinaLitro,
        },
        salesAnalysisEnabled: canReadVentas,
        resolveOriginCode,
      }),
    [
      blocks,
      canReadVentas,
      config.costoResinaLitro,
      config.costosAnalisisEstado,
      gastos,
      mermas,
      monoHiloMasas,
      produccion,
      produccionTrabajadores,
      productos,
      ventas,
    ],
  )

  const filteredOriginProfiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return originProfiles

    return originProfiles.filter((profile) =>
      [
        profile.code,
        profile.originName,
        profile.provider,
        profile.block?.canteraOrigen ?? '',
        profile.entryDate,
        profile.blockType ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [originProfiles, searchTerm])

  const selectedOriginProfile = useMemo(
    () =>
      filteredOriginProfiles.find((profile) => profile.originId === selectedOriginId) ??
      originProfiles.find((profile) => profile.originId === selectedOriginId) ??
      null,
    [filteredOriginProfiles, originProfiles, selectedOriginId],
  )

  useEffect(() => {
    if (selectedOriginId && !selectedOriginProfile) {
      setSelectedOriginId(null)
    }
  }, [selectedOriginId, selectedOriginProfile])

  const monoHiloFormulaHint = useMemo(() => {
    const divisor = config.monoHiloEspesorLosaCm / 100 + config.monoHiloGrosorDiscoMm / 1000
    return `Losas estimadas = largo total de masas en metros / ${divisor.toFixed(3)}. Se considera ${config.monoHiloEspesorLosaCm.toFixed(1)} cm de espesor de losa y ${config.monoHiloGrosorDiscoMm.toFixed(0)} mm de corte del disco.`
  }, [config.monoHiloEspesorLosaCm, config.monoHiloGrosorDiscoMm])

  return (
    <>
      <div className="overflow-hidden rounded-[var(--agent-radius-panel)] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Trazabilidad del bloque</p>
            <h2 className="text-lg font-semibold text-slate-900">Mono hilo, picado, costos y cierre por origen</h2>
            <p className="mt-1 text-xs text-slate-500">
              Todo lo relacionado con el bloque o lote vive aqui; las masas resultantes continúan en su inventario propio.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
            {filteredOriginProfiles.length} fichas
          </Badge>
        </div>

        {loading ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
            Cargando trazabilidad operativa...
          </div>
        ) : error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : filteredOriginProfiles.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
            No hay bloques o lotes para los filtros actuales.
          </div>
        ) : (
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Fecha de entrada</TableHead>
                  <TableHead className="text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOriginProfiles.map((profile) => (
                  <TableRow key={profile.originId}>
                    <TableCell className="whitespace-normal">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{profile.code}</p>
                          {profile.blockType ? (
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                              {profile.blockType}
                            </Badge>
                          ) : null}
                          {profile.baseDimension ? (
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                              {profile.baseDimension}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500">{profile.provider}</p>
                        <p className="text-xs text-slate-500">
                          {profile.totalVisibleSlabs.toLocaleString()} losas visibles / {profile.totalVisibleM2.toFixed(2)} m2
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <p className="font-medium text-slate-900">{profile.entryDate || '--'}</p>
                      <p className="text-xs text-slate-500">
                        {profile.blockStatus ? `Estado ${profile.blockStatus}` : 'Sin estado'}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOriginId(profile.originId)
                        }}
                      >
                        Visualizar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <InventoryOriginDetailDialog
        profile={selectedOriginProfile}
        open={selectedOriginProfile !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedOriginId(null)
        }}
        monoHiloFormulaHint={monoHiloFormulaHint}
      />
    </>
  )
}
