'use client'

import React from "react"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  title?: string
  data: T[]
  columns: Column<T>[]
  emptyMessage?: string
}

export function DataTable<T extends { id: string }>({
  title,
  data,
  columns,
  emptyMessage = 'No hay datos disponibles'
}: DataTableProps<T>) {
  const getValue = (item: T, key: string) => {
    const keys = key.split('.')
    let value: unknown = item
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k]
    }
    return value
  }

  return (
    <Card className="overflow-hidden rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] py-0 shadow-[var(--dash-shadow)] backdrop-blur-xl">
      {title && (
        <CardHeader className="border-b border-white/60 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pb-4 pt-4">
        {data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((item) => (
              <div
                key={item.id}
                className="relative rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl"
              >
                <div className="space-y-2.5">
                  {columns.map((column) => {
                    const isActions =
                      String(column.key).toLowerCase() === 'actions' ||
                      column.header.toLowerCase().includes('acciones')

                    if (isActions) {
                      return (
                        <div
                          key={`${item.id}-${String(column.key)}`}
                          className="flex justify-end pt-1"
                        >
                          <div className="pointer-events-auto">
                            {column.render
                              ? column.render(item)
                              : String(getValue(item, String(column.key)) ?? '')}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={`${item.id}-${String(column.key)}`}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <span className="pointer-events-none text-[10px] uppercase tracking-[0.28em] text-slate-500">
                          {column.header}
                        </span>
                        <div className="text-right text-sm font-medium text-slate-900">
                          {column.render
                            ? column.render(item)
                            : String(getValue(item, String(column.key)) ?? '')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
