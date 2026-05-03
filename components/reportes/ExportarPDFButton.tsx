// ExportarPDFButton.tsx — Botón que genera y descarga un PDF usando @react-pdf/renderer
'use client'

import { useState, useCallback } from 'react'
import { pdf, Document as PDFDocument } from '@react-pdf/renderer'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportarPDFButtonProps {
  /** Elemento React de tipo <Document> de @react-pdf/renderer */
  pdfDocument: React.ReactElement<React.ComponentProps<typeof PDFDocument>>
  fileName: string
}

export function ExportarPDFButton({ pdfDocument, fileName }: ExportarPDFButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = useCallback(async () => {
    setLoading(true)
    try {
      // Generar el blob del PDF desde el elemento React del documento
      const blob = await pdf(pdfDocument).toBlob()
      const url = URL.createObjectURL(blob)

      // Disparar descarga en el navegador
      const link = window.document.createElement('a')
      link.href = url
      link.download = fileName
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)

      // Liberar el object URL
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al exportar PDF:', error)
    } finally {
      setLoading(false)
    }
  }, [pdfDocument, fileName])

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
      {loading ? 'Generando PDF…' : 'Exportar PDF'}
    </Button>
  )
}
