// ExportarCSVButton.tsx — Botón que convierte datos a CSV y los descarga
'use client'

import { useState, useCallback } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportarCSVButtonProps {
  /** Array de objetos planos con los datos a exportar */
  data: Record<string, unknown>[]
  /** Nombre del archivo de descarga (sin extensión) */
  fileName: string
  /** Definición de columnas: key mapea a las propiedades de data, label es el encabezado */
  headers: { key: string; label: string }[]
}

/**
 * Escapa un valor de celda para CSV.
 * Si contiene comillas, saltos de línea o comas, se envuelve en comillas dobles
 * y se duplican las comillas internas.
 */
function escapeCSVValue(value: unknown): string {
  const str = value == null ? '' : String(value)

  // Reemplazar saltos de línea por espacio para evitar filas rotas
  const sanitized = str.replace(/[\r\n]+/g, ' ')

  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
    return `"${sanitized.replace(/"/g, '""')}"`
  }

  return sanitized
}

export function ExportarCSVButton({ data, fileName, headers }: ExportarCSVButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = useCallback(() => {
    setLoading(true)
    try {
      // Construir el contenido CSV
      const lines: string[] = []

      // Fila de encabezados
      lines.push(headers.map((h) => escapeCSVValue(h.label)).join(','))

      // Filas de datos
      for (const row of data) {
        lines.push(headers.map((h) => escapeCSVValue(row[h.key])).join(','))
      }

      // Agregar BOM (Byte Order Mark) para compatibilidad UTF-8 con Excel
      const bom = '\uFEFF'
      const csvContent = bom + lines.join('\n')

      // Crear blob y disparar descarga
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al exportar CSV:', error)
    } finally {
      setLoading(false)
    }
  }, [data, fileName, headers])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Download />
      )}
      {loading ? 'Generando CSV…' : 'Exportar CSV'}
    </Button>
  )
}
