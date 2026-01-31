'use client'

import React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
    <Card className="border-border/50">
      {title && (
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? '' : 'pt-6'}>
        <div className="space-y-4 md:hidden">
          {data.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            data.map((item) => (
              <div
                key={item.id}
                className="relative rounded-xl border border-border/60 bg-card p-4 shadow-sm"
              >
                <div className="space-y-3">
                  {columns.map((column) => {
                    const isActions =
                      String(column.key).toLowerCase() === 'actions' ||
                      column.header.toLowerCase().includes('acciones')

                    if (isActions) {
                      return (
                        <div
                          key={`${item.id}-${String(column.key)}`}
                          className="flex justify-end pt-2"
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
                        className="flex items-start justify-between gap-4 text-sm"
                      >
                        <span className="pointer-events-none text-xs uppercase tracking-[0.25em] text-muted-foreground">
                          {column.header}
                        </span>
                        <div className="text-right text-foreground">
                          {column.render
                            ? column.render(item)
                            : String(getValue(item, String(column.key)) ?? '')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={String(column.key)} className="text-muted-foreground">
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-muted-foreground py-8"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    {columns.map((column) => (
                      <TableCell key={`${item.id}-${String(column.key)}`}>
                        {column.render
                          ? column.render(item)
                          : String(getValue(item, String(column.key)) ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
