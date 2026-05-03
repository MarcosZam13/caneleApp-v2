// DireccionFormDialog.tsx — Dialog para agregar o editar una dirección de cliente
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { crearDireccion, actualizarDireccion, resolveGoogleMapsLink } from '@/actions/clientes.actions'

type DireccionExistente = {
  id_direccion: string
  direccion_texto: string | null
  Provincia: string | null
  Canton: string | null
  Distrito: string | null
  hora_inicio: string | null
  hora_fin: string | null
  activa: boolean | null
  lat?: number | null
  lng?: number | null
}

interface DireccionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  idCliente: string
  direccion?: DireccionExistente  // si viene, es edición; si no, es creación
}

export function DireccionFormDialog({ open, onOpenChange, idCliente, direccion }: DireccionFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [texto, setTexto] = useState('')
  const [provincia, setProvincia] = useState('')
  const [canton, setCanton] = useState('')
  const [distrito, setDistrito] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [activa, setActiva] = useState(true)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [extracting, setExtracting] = useState(false)

  // Precarga los valores cuando es edición
  useEffect(() => {
    if (direccion) {
      setTexto(direccion.direccion_texto ?? '')
      setProvincia(direccion.Provincia ?? '')
      setCanton(direccion.Canton ?? '')
      setDistrito(direccion.Distrito ?? '')
      setHoraInicio(direccion.hora_inicio ?? '')
      setHoraFin(direccion.hora_fin ?? '')
      setActiva(direccion.activa ?? true)
      setLat(direccion.lat != null ? String(direccion.lat) : '')
      setLng(direccion.lng != null ? String(direccion.lng) : '')
    } else {
      setTexto('')
      setProvincia('')
      setCanton('')
      setDistrito('')
      setHoraInicio('')
      setHoraFin('')
      setActiva(true)
      setLat('')
      setLng('')
    }
    setLinkInput('')
  }, [direccion, open])

  // Extrae coordenadas de un link de Google Maps o texto "lat,lng"
  async function handleExtractLink() {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const latNum = lat.trim() ? parseFloat(lat.trim()) : null
    const lngNum = lng.trim() ? parseFloat(lng.trim()) : null

    const formData = {
      direccion_texto: texto,
      Provincia: provincia || null,
      Canton: canton || null,
      Distrito: distrito || null,
      hora_inicio: horaInicio || null,
      hora_fin: horaFin || null,
      activa,
      lat: latNum && !isNaN(latNum) ? latNum : null,
      lng: lngNum && !isNaN(lngNum) ? lngNum : null,
    }

    setLoading(true)
    const result = direccion
      ? await actualizarDireccion(direccion.id_direccion, idCliente, formData)
      : await crearDireccion(idCliente, formData)
    setLoading(false)

    if (result.success) {
      toast.success(direccion ? 'Dirección actualizada' : 'Dirección agregada')
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{direccion ? 'Editar dirección' : 'Agregar dirección'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="texto">Dirección *</Label>
            <Input
              id="texto"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Ej: 100m norte del parque central"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="provincia">Provincia</Label>
              <Input id="provincia" value={provincia} onChange={e => setProvincia(e.target.value)} placeholder="San José" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="canton">Cantón</Label>
              <Input id="canton" value={canton} onChange={e => setCanton(e.target.value)} placeholder="Central" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="distrito">Distrito</Label>
              <Input id="distrito" value={distrito} onChange={e => setDistrito(e.target.value)} placeholder="Carmen" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inicio">Hora inicio entrega</Label>
              <Input id="inicio" type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin">Hora fin entrega</Label>
              <Input id="fin" type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={activa}
              onCheckedChange={setActiva}
            />
            <Label>Dirección activa</Label>
          </div>

          {/* Sección de coordenadas — opcional, usada para mostrar en el mapa */}
          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Ubicación en el mapa (opcional)
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Pegar link de Google Maps o lat,lng"
                value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExtractLink}
                disabled={!linkInput.trim() || extracting}
                className="shrink-0"
              >
                {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Extraer'}
              </Button>
            </div>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {direccion ? 'Guardar cambios' : 'Agregar dirección'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
