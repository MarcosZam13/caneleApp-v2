'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function MorososAlert({ morososCount }: { morososCount: number }) {
  useEffect(() => {
    if (morososCount > 0) {
      toast.warning(`Tienes ${morososCount} cliente(s) con deuda pendiente`, {
        description: 'Revisa la sección de Pagos para más detalles',
        duration: 8000,
      })
    }
  }, [morososCount])

  return null
}
