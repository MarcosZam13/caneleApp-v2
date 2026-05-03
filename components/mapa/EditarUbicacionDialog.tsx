// EditarUbicacionDialog.tsx — Dialog para asignar o corregir coordenadas de una parada desde el mapa
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { actualizarCoordenadas, resolveGoogleMapsLink } from '@/actions/clientes.actions'

interface EditarUbicacionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  idDireccion: string
  idCliente: string
  clienteNombre: string
  latActual?: number
  lngActual?: number
  onSaved: (lat: number, lng: number) => void
}

export function EditarUbicacionDialog({
  open, onOpenChange, idDireccion, idCliente, clienteNombre, latActual, lngActual, onSaved,
}: EditarUbicacionDialogProps) {
  const [linkInput, setLinkInput] = useState('')
  const [lat, setLat] = useState(latActual && latActual !== 0 ? String(latActual) : '')
  const [lng, setLng] = useState(lngActual && lngActual !== 0 ? String(lngActual) : '')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleExtract() {
    if (!linkInput.trim()) return
    setExtracting(true)
    const result = await resolveGoogleMapsLink(linkInput.trim())
    setExtracting(false)
    if (result.success && result.data) {
      setLat(String(result.data.lat))
      setLng(String(result.data.lng))
      setLinkInput('')
      toast.success('Coordenadas extraídas correctamente')
    } else if (!result.success) {
      toast.error(result.error ?? 'No se pudo extraer el enlace')
    }
  }

  async function handleSave() {
    const latNum = parseFloat(lat.trim())
    const lngNum = parseFloat(lng.trim())
    if (isNaN(latNum) || isNaN(lngNum)) {
      toast.error('Ingresa coordenadas válidas')
      return
    }
    setSaving(true)
    const result = await actualizarCoordenadas(idDireccion, idCliente, latNum, lngNum)
    setSaving(false)
    if (result.success) {
      onSaved(latNum, lngNum)
      onOpenChange(false)
      toast.success('Ubicación guardada')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Ubicación de {clienteNombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pegar link de Google Maps */}
          <div className="space-y-1.5">
            <Label className="text-sm">Pegar enlace de Google Maps</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://maps.app.goo.gl/... o lat,lng"
                value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleExtract()}
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExtract}
                disabled={!linkInput.trim() || extracting}
                className="shrink-0"
              >
                {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Extraer'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              También puedes ingresar directamente "latitud,longitud"
            </p>
          </div>

          {/* Campos manuales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Latitud</Label>
              <Input
                value={lat}
                onChange={e => setLat(e.target.value)}
                placeholder="9.9281"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Longitud</Label>
              <Input
                value={lng}
                onChange={e => setLng(e.target.value)}
                placeholder="-84.0907"
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!lat || !lng || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar ubicación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
