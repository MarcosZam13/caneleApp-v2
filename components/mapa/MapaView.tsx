// MapaView.tsx — Mapa interactivo de entregas con API moderna de Google Maps (AdvancedMarkerElement)
'use client'

import { useState, useRef, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  MapPin, Navigation, CheckCircle2, Clock, ExternalLink,
  LocateFixed, Route, Save, Trash2, ChevronUp, ChevronDown, X,
  Package, DollarSign, Phone,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  getRutaCompleta,
  marcarPedidoEntregado,
  marcarPedidoPagado,
  saveOrdenEntrega,
  clearOrdenEntrega,
} from '@/actions/rutas.actions'
import { EditarUbicacionDialog } from './EditarUbicacionDialog'
import type { Ruta } from '@/types/database'

// Centro por defecto — San José, Costa Rica
const DEFAULT_CENTER = { lat: 9.9281, lng: -84.0907 }

// Desfase para puntos en las mismas coordenadas — 35m es visible desde zoom 13+
const JITTER_OFFSET = 0.00032

type ProductoItem = {
  nombre: string
  cantidad: number
  rebanado: boolean
  cuadrado: boolean
  sub_total: number
}

type PedidoStop = {
  id_pedido: string
  id_direccion: string | null
  id_cliente: string | null
  posicion: number
  lat: number
  lng: number
  clienteNombre: string
  clienteTelefono: string | null
  direccionTexto: string
  total: number
  entregado: boolean
  pagado: boolean
  productos: ProductoItem[]
}

interface MapaViewProps {
  rutas: Ruta[]
  apiKey: string
}

// Separa los puntos duplicados distribuyéndolos en anillo para que sean visibles
function applyCoordJitter(stops: PedidoStop[]): PedidoStop[] {
  const seen = new Map<string, number>()
  return stops.map((stop) => {
    const key = `${stop.lat.toFixed(5)},${stop.lng.toFixed(5)}`
    const count = seen.get(key) ?? 0
    seen.set(key, count + 1)
    if (count === 0) return stop
    // Distribuir en 6 posiciones alrededor del punto central
    const angle = (count % 6) * (Math.PI / 3)
    return {
      ...stop,
      lat: stop.lat + JITTER_OFFSET * Math.cos(angle),
      lng: stop.lng + JITTER_OFFSET * Math.sin(angle),
    }
  })
}

// Crea el elemento HTML que representa el marcador en el mapa
function buildMarkerElement(
  numero: number,
  entregado: boolean,
  pagado: boolean,
  isSelected: boolean,
  inOrderMode: boolean
): HTMLElement {
  const el = document.createElement('div')
  // Color según estado del pedido
  const bg = entregado && pagado
    ? '#22c55e'   // verde — entregado y pagado
    : entregado
    ? '#3b82f6'   // azul — entregado, sin pagar
    : pagado
    ? '#a855f7'   // morado — no entregado, pagado
    : '#f97316'   // naranja — pendiente

  const size = isSelected ? 38 : 32
  const border = isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.9)'
  const shadow = isSelected
    ? '0 3px 12px rgba(0,0,0,0.4), 0 0 0 3px rgba(var(--color-primary),0.3)'
    : '0 2px 6px rgba(0,0,0,0.25)'

  el.style.cssText = [
    `width:${size}px`, `height:${size}px`, `border-radius:50%`, `background:${bg}`,
    `color:white`, `display:flex`, `align-items:center`, `justify-content:center`,
    `font-size:${isSelected ? 14 : 12}px`, `font-weight:bold`,
    `border:${border}`, `box-shadow:${shadow}`,
    `cursor:pointer`, `transition:all 0.15s ease`,
    inOrderMode ? 'opacity:1' : '',
  ].join(';')

  el.textContent = String(numero)
  return el
}

export function MapaView({ rutas, apiKey }: MapaViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoWindowRef = useRef<any>(null)

  // Ref para evitar stale closure en los listeners de Google Maps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMarkerClickRef = useRef<(stop: PedidoStop) => void>(() => {})

  const [mapsReady, setMapsReady] = useState(false)
  const [mapsError, setMapsError] = useState<string | null>(null)
  const [rutaId, setRutaId] = useState('')
  const [stops, setStops] = useState<PedidoStop[]>([])
  const [stopsSinCoords, setStopsSinCoords] = useState<PedidoStop[]>([])
  const [ordenEntrega, setOrdenEntrega] = useState<PedidoStop[]>([])
  const [loadingRuta, setLoadingRuta] = useState(false)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [creandoRuta, setCreandoRuta] = useState(false)
  const [modalStop, setModalStop] = useState<PedidoStop | null>(null)
  const [savingOrden, setSavingOrden] = useState(false)
  const [editandoUbicacion, setEditandoUbicacion] = useState<PedidoStop | null>(null)

  // Carga la API de Google Maps y luego inicializa el mapa
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!apiKey) {
      setMapsError('Falta la API key de Google Maps (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function googleMaps(): any {
      return (window as any).google?.maps
    }

    // Espera polling hasta que window.google.maps esté listo (máx 10s)
    function waitForGoogleMaps(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (googleMaps()) { resolve(); return }
        let attempts = 0
        const poll = setInterval(() => {
          attempts++
          if (googleMaps()) { clearInterval(poll); resolve() }
          else if (attempts > 100) { clearInterval(poll); reject(new Error('Timeout esperando Google Maps')) }
        }, 100)
      })
    }

    async function init() {
      // Si ya está cargado, inicializar directamente
      if (googleMaps()) {
        await setupMap()
        return
      }

      // Inyectar el script solo si no existe todavía
      if (!document.getElementById('gm-script')) {
        const callbackName = '__gmCb'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any)[callbackName] = () => { delete (window as any)[callbackName] }
        const script = document.createElement('script')
        script.id = 'gm-script'
        // Cargamos maps y marker en la URL — no necesitamos importLibrary luego
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&v=weekly&callback=${callbackName}`
        script.async = true
        script.onerror = () => setMapsError('No se pudo cargar Google Maps. Verifica la API key.')
        document.head.appendChild(script)
      }

      // Esperar a que la API esté disponible (el script puede estar cargando)
      await waitForGoogleMaps()
      await setupMap()
    }

    init().catch((err) => {
      console.error('[MapaView]', err)
      setMapsError('Error al inicializar el mapa. Verifica la API key y que Billing esté habilitado.')
    })
  // La clave no cambia en runtime
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function setupMap() {
    if (!mapContainerRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gm = (window as any).google?.maps
    if (!gm) {
      setMapsError('Google Maps no está disponible. Verifica la API key.')
      return
    }
    // Usamos google.maps.Map directamente (ya cargado con &libraries=marker en la URL)
    mapRef.current = new gm.Map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 10,
      // mapId requerido para AdvancedMarkerElement
      mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID',
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      zoomControl: true,
    })
    setMapsReady(true)
  }

  // Notifica a Google Maps cuando el contenedor cambia de tamaño para que recalcule correctamente
  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || !mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gm = (window as any).google?.maps
    if (!gm) return
    const observer = new ResizeObserver(() => {
      gm.event.trigger(mapRef.current, 'resize')
    })
    observer.observe(mapContainerRef.current)
    return () => observer.disconnect()
  }, [mapsReady])

  // Actualiza los marcadores cada vez que cambian las paradas, la selección o el modo de creación
  useEffect(() => {
    if (!mapsReady || !mapRef.current) return

    async function syncMarkers() {
      // AdvancedMarkerElement está disponible directamente porque cargamos &libraries=marker en la URL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AdvancedMarkerElement = (window as any).google?.maps?.marker?.AdvancedMarkerElement
      if (!AdvancedMarkerElement) return

      // Elimina marcadores de pedidos que ya no existen en el listado
      const currentIds = new Set(stops.map((s) => s.id_pedido))
      for (const [id, marker] of markersRef.current.entries()) {
        if (!currentIds.has(id)) {
          marker.map = null
          markersRef.current.delete(id)
        }
      }

      // Crea o actualiza cada marcador
      const posicionEnOrden = new Map(ordenEntrega.map((s, i) => [s.id_pedido, i + 1]))

      for (const stop of stops) {
        const isSelected = selectedStopId === stop.id_pedido
        const posOrden = posicionEnOrden.get(stop.id_pedido)
        const numero = creandoRuta ? (posOrden ?? '·') : stop.posicion

        const content = buildMarkerElement(
          typeof numero === 'number' ? numero : 0,
          stop.entregado,
          stop.pagado,
          isSelected,
          creandoRuta
        )

        // Si el marcador es el especial "·" en modo creación, cambiar el texto
        if (creandoRuta && !posOrden) {
          content.textContent = '·'
          content.style.fontSize = '20px'
          content.style.background = '#9ca3af'
        }

        // El seleccionado siempre encima — el resto apilados por posición
        const zIndex = isSelected ? 9999 : stop.posicion

        const existing = markersRef.current.get(stop.id_pedido)
        if (existing) {
          // Actualizar contenido y z-index sin recrear el marcador
          existing.content = content
          existing.zIndex = zIndex
        } else {
          const marker = new AdvancedMarkerElement({
            position: { lat: stop.lat, lng: stop.lng },
            map: mapRef.current,
            content,
            title: stop.clienteNombre,
            zIndex,
          })
          marker.addListener('click', () => handleMarkerClickRef.current(stop))
          markersRef.current.set(stop.id_pedido, marker)
        }
      }
    }

    syncMarkers().catch(console.error)
  // Sincronizar cuando cambian las dependencias visuales del mapa
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, stops, selectedStopId, creandoRuta, ordenEntrega])

  // Maneja el click en un marcador según el modo activo
  function handleMarkerClick(stop: PedidoStop) {
    if (creandoRuta) {
      setOrdenEntrega((prev) => {
        const existe = prev.some((x) => x.id_pedido === stop.id_pedido)
        return existe
          ? prev.filter((x) => x.id_pedido !== stop.id_pedido)
          : [...prev, stop]
      })
    } else {
      setSelectedStopId(stop.id_pedido)
      setModalStop(stop)
    }
  }

  // Mantener el ref actualizado en cada render para que los listeners de Maps no queden stale
  handleMarkerClickRef.current = handleMarkerClick

  async function handleRutaChange(id: string) {
    setRutaId(id)
    setStops([])
    setStopsSinCoords([])
    setOrdenEntrega([])
    setSelectedStopId(null)
    setModalStop(null)
    setCreandoRuta(false)
    if (!id) return

    setLoadingRuta(true)
    const data = await getRutaCompleta(id)
    setLoadingRuta(false)
    if (!data) return

    const conCoords: PedidoStop[] = []
    const sinCoords: PedidoStop[] = []

    data.pedidos.forEach((pedido, idx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dir = pedido.direccion as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cliente = pedido.cliente as any

      const stop: PedidoStop = {
        id_pedido: pedido.id_pedido,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id_direccion: (pedido as any).id_direccion ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id_cliente: (pedido as any).id_cliente ?? null,
        posicion: idx + 1,
        lat: dir?.lat ?? 0,
        lng: dir?.lng ?? 0,
        clienteNombre: cliente?.nombre ?? 'Cliente',
        clienteTelefono: cliente?.telefono ?? null,
        direccionTexto: dir?.direccion_texto ?? 'Sin dirección',
        total: Number(pedido.total ?? 0),
        entregado: pedido.entregado ?? false,
        pagado: pedido.pagado ?? false,
        productos: (pedido.pedido_producto ?? []).map((pp: {
          cantidad: number | null
          rebanado: boolean | null
          cuadrado: boolean | null
          sub_total: number | null
          producto: { nombre: string } | null
        }) => ({
          nombre: pp.producto?.nombre ?? 'Producto',
          cantidad: pp.cantidad ?? 1,
          rebanado: pp.rebanado ?? false,
          cuadrado: pp.cuadrado ?? false,
          sub_total: Number(pp.sub_total ?? 0),
        })),
      }

      if (dir?.lat && dir?.lng) conCoords.push(stop)
      else sinCoords.push(stop)
    })

    const conOrden = applyCoordJitter(conCoords)
    setStops(conOrden)
    setStopsSinCoords(sinCoords)

    // Si hay un orden guardado en la DB, reconstruir el estado ordenEntrega
    if (data.ordenGuardado.length > 0) {
      const posMap = new Map(data.ordenGuardado.map((o) => [o.id_pedido, o.posicion]))
      const ordenado = conOrden
        .filter((s) => posMap.has(s.id_pedido))
        .sort((a, b) => (posMap.get(a.id_pedido) ?? 999) - (posMap.get(b.id_pedido) ?? 999))
      setOrdenEntrega(ordenado)
    }

  }

  function handleGetLocation() {
    if (!navigator.geolocation) {
      toast.error('La geolocalización no está disponible en este dispositivo')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        if (mapRef.current) {
          mapRef.current.panTo(loc)
          mapRef.current.setZoom(15)
        }
        // Marcador azul para la ubicación actual del usuario
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AdvancedMarkerElement = (window as any).google?.maps?.marker?.AdvancedMarkerElement
        if (!AdvancedMarkerElement) return
        if (userMarkerRef.current) userMarkerRef.current.map = null
        const el = document.createElement('div')
        el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)'
        userMarkerRef.current = new AdvancedMarkerElement({
          position: loc, map: mapRef.current, content: el, title: 'Mi ubicación',
        })
        toast.success('Ubicación obtenida')
      },
      () => toast.error('No se pudo obtener la ubicación')
    )
  }

  async function handleSaveOrden() {
    if (!rutaId || ordenEntrega.length === 0) return
    setSavingOrden(true)
    const result = await saveOrdenEntrega(
      rutaId,
      ordenEntrega.map((s, i) => ({ id_pedido: s.id_pedido, posicion: i + 1 }))
    )
    setSavingOrden(false)
    if (result.success) {
      toast.success('Orden guardado correctamente')
      setCreandoRuta(false)
    } else {
      toast.error(result.error)
    }
  }

  async function handleClearOrden() {
    if (!rutaId) { setOrdenEntrega([]); return }
    const result = await clearOrdenEntrega(rutaId)
    if (result.success) {
      setOrdenEntrega([])
      toast.success('Orden eliminado')
    } else {
      toast.error(result.error)
    }
  }

  function moverEnOrden(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= ordenEntrega.length) return
    const copia = [...ordenEntrega]
    ;[copia[index], copia[next]] = [copia[next], copia[index]]
    setOrdenEntrega(copia)
  }

  // Actualiza el estado local de un stop (sin recargar desde el servidor)
  function updateStopLocally(idPedido: string, patch: Partial<PedidoStop>) {
    setStops((prev) => prev.map((s) => s.id_pedido === idPedido ? { ...s, ...patch } : s))
    setModalStop((prev) => prev?.id_pedido === idPedido ? { ...prev, ...patch } : prev)
    setOrdenEntrega((prev) => prev.map((s) => s.id_pedido === idPedido ? { ...s, ...patch } : s))
  }

  async function handleMarcarEntregado(stop: PedidoStop) {
    if (stop.entregado) return
    const result = await marcarPedidoEntregado(stop.id_pedido, rutaId)
    if (result.success) {
      updateStopLocally(stop.id_pedido, { entregado: true })
      toast.success(`${stop.clienteNombre} marcado como entregado`)
    } else {
      toast.error(result.error)
    }
  }

  async function handleMarcarPagado(stop: PedidoStop) {
    if (stop.pagado) return
    const result = await marcarPedidoPagado(stop.id_pedido, rutaId)
    if (result.success) {
      updateStopLocally(stop.id_pedido, { pagado: true })
      toast.success(`${stop.clienteNombre} marcado como pagado`)
    } else {
      toast.error(result.error)
    }
  }

  function openInMaps(stop: PedidoStop) {
    const url = `https://www.google.com/maps?q=${stop.lat},${stop.lng}`
    window.open(url, '_blank')
  }

  // Mueve la parada de stopsSinCoords a stops con las nuevas coordenadas
  function handleUbicacionGuardada(stop: PedidoStop, lat: number, lng: number) {
    const updated = { ...stop, lat, lng }
    setStopsSinCoords((prev) => prev.filter((s) => s.id_pedido !== stop.id_pedido))
    setStops((prev) => {
      const sin = applyCoordJitter([...prev, updated])
      return sin
    })
    setEditandoUbicacion(null)
  }

  const rutaActual = rutas.find((r) => r.id_ruta === rutaId)
  const totalParadas = stops.length + stopsSinCoords.length

  return (
    <div className="flex flex-col gap-4" style={{ minHeight: 'calc(100vh - 180px)' }}>
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        {/* Selector de ruta */}
        <div className="flex-1 max-w-sm">
          <select
            value={rutaId}
            onChange={(e) => handleRutaChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Selecciona una ruta...</option>
            {rutas.map((ruta) => (
              <option key={ruta.id_ruta} value={ruta.id_ruta}>
                {ruta.nombre ?? 'Sin nombre'}
                {ruta.fecha
                  ? ` — ${format(parseISO(ruta.fecha + 'T12:00:00'), "dd 'de' MMMM", { locale: es })}`
                  : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Botones de acción — solo visibles con una ruta seleccionada */}
        {rutaActual && mapsReady && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Geolocalización */}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGetLocation}>
              <LocateFixed className="h-3.5 w-3.5" />
              Mi ubicación
            </Button>

            {/* Modo orden manual */}
            <Button
              variant={creandoRuta ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setCreandoRuta((v) => !v)}
            >
              <Route className="h-3.5 w-3.5" />
              {creandoRuta ? 'Cerrar orden' : 'Editar orden'}
            </Button>

            {/* Guardar orden — visible cuando hay paradas en el orden */}
            {ordenEntrega.length > 0 && (
              <>
                <Button size="sm" className="gap-1.5" onClick={handleSaveOrden} disabled={savingOrden}>
                  <Save className="h-3.5 w-3.5" />
                  {savingOrden ? 'Guardando...' : 'Guardar orden'}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={handleClearOrden}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpiar orden
                </Button>
              </>
            )}
          </div>
        )}

        {/* Resumen de paradas */}
        {rutaActual && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground sm:ml-auto">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {totalParadas} paradas
            </span>
            {stopsSinCoords.length > 0 && (
              <span className="text-amber-600">{stopsSinCoords.length} sin coordenadas</span>
            )}
          </div>
        )}
      </div>

      {/* Aviso de modo orden */}
      {creandoRuta && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-2.5 text-sm text-blue-800 dark:text-blue-200">
          Toca los marcadores del mapa para agregar o quitar paradas del orden. Usa ↑↓ para reordenar la lista.
        </div>
      )}

      {/* Contenido principal: mapa + lista lateral con altura fija para evitar que el mapa se mueva */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contenedor del mapa — altura fija para que el sidebar no lo desplace */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden border bg-muted relative h-[480px] lg:h-[calc(100vh-260px)]">
          <div ref={mapContainerRef} className="w-full h-full" />
          {!mapsReady && !mapsError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <p className="text-muted-foreground text-sm">Cargando mapa...</p>
            </div>
          )}
          {mapsError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-2 p-6 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No se pudo cargar el mapa</p>
              <p className="text-xs text-muted-foreground max-w-xs">{mapsError}</p>
            </div>
          )}
        </div>

        {/* Panel lateral: altura fija e igual al mapa, scroll interno */}
        <div className="space-y-2 overflow-y-auto h-[480px] lg:h-[calc(100vh-260px)]">
          {loadingRuta && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Cargando ruta...</p>
            </div>
          )}

          {!loadingRuta && !rutaId && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Selecciona una ruta para ver las paradas</p>
            </div>
          )}

          {!loadingRuta && rutaId && stops.length === 0 && stopsSinCoords.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">Esta ruta no tiene pedidos</p>
          )}

          {/* Modo editar orden: lista del orden arriba, disponibles abajo */}
          {creandoRuta && !loadingRuta && rutaId && (
            <>
              {/* Orden construido */}
              <p className="text-xs font-semibold text-muted-foreground px-1">
                Orden de entrega ({ordenEntrega.length})
              </p>

              {ordenEntrega.length === 0 ? (
                <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                  Toca los marcadores del mapa para agregar paradas
                </div>
              ) : (
                ordenEntrega.map((stop, idx) => (
                  <div
                    key={stop.id_pedido}
                    className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="flex-1 truncate font-medium">{stop.clienteNombre}</span>
                    <p className="text-xs text-muted-foreground truncate hidden sm:block max-w-[80px]">{stop.direccionTexto}</p>
                    <div className="flex gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moverEnOrden(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moverEnOrden(idx, 1)}
                        disabled={idx === ordenEntrega.length - 1}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrdenEntrega((prev) => prev.filter((x) => x.id_pedido !== stop.id_pedido))}
                        className="p-1 rounded hover:bg-muted text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Paradas todavía no asignadas al orden */}
              {stops.filter((s) => !ordenEntrega.some((o) => o.id_pedido === s.id_pedido)).length > 0 && (
                <>
                  <Separator className="my-2" />
                  <p className="text-xs font-semibold text-muted-foreground px-1">
                    Sin asignar ({stops.filter((s) => !ordenEntrega.some((o) => o.id_pedido === s.id_pedido)).length})
                  </p>
                  {stops
                    .filter((s) => !ordenEntrega.some((o) => o.id_pedido === s.id_pedido))
                    .map((stop) => (
                      <StopCard
                        key={stop.id_pedido}
                        stop={stop}
                        isSelected={false}
                        inOrden={false}
                        onSelect={() => handleMarkerClick(stop)}
                        onNavigate={() => openInMaps(stop)}
                      />
                    ))}
                </>
              )}
            </>
          )}

          {/* Modo normal: paradas con coordenadas */}
          {!creandoRuta && stops.map((stop) => (
            <StopCard
              key={stop.id_pedido}
              stop={stop}
              isSelected={selectedStopId === stop.id_pedido}
              inOrden={ordenEntrega.some((x) => x.id_pedido === stop.id_pedido)}
              onSelect={() => {
                setSelectedStopId(stop.id_pedido)
                setModalStop(stop)
              }}
              onNavigate={() => openInMaps(stop)}
            />
          ))}

          {/* Paradas sin coordenadas — siempre visibles */}
          {!creandoRuta && stopsSinCoords.length > 0 && (
            <>
              {stops.length > 0 && (
                <p className="text-xs text-muted-foreground px-1 pt-2">Sin coordenadas (no aparecen en el mapa)</p>
              )}
              {stopsSinCoords.map((stop) => (
                <StopCard
                  key={stop.id_pedido}
                  stop={stop}
                  isSelected={false}
                  inOrden={false}
                  onSelect={() => { setModalStop(stop) }}
                  onNavigate={() => openInMaps(stop)}
                  noCoords
                  onEditarUbicacion={stop.id_direccion ? () => setEditandoUbicacion(stop) : undefined}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Dialog para agregar/editar ubicación desde el mapa */}
      {editandoUbicacion && editandoUbicacion.id_direccion && (
        <EditarUbicacionDialog
          open={!!editandoUbicacion}
          onOpenChange={(open) => !open && setEditandoUbicacion(null)}
          idDireccion={editandoUbicacion.id_direccion}
          idCliente={editandoUbicacion.id_cliente ?? ''}
          clienteNombre={editandoUbicacion.clienteNombre}
          latActual={editandoUbicacion.lat}
          lngActual={editandoUbicacion.lng}
          onSaved={(lat, lng) => handleUbicacionGuardada(editandoUbicacion, lat, lng)}
        />
      )}

      {/* Modal de detalle de parada */}
      {modalStop && !creandoRuta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setModalStop(null); setSelectedStopId(null) }} />
          <Card className="relative z-10 w-full max-w-md shadow-xl">
            <CardContent className="p-5">
              {/* Header del modal */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{modalStop.clienteNombre}</p>
                  {modalStop.clienteTelefono && (
                    <a
                      href={`tel:${modalStop.clienteTelefono}`}
                      className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 hover:text-foreground"
                    >
                      <Phone className="h-3 w-3" />
                      {modalStop.clienteTelefono}
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setModalStop(null); setSelectedStopId(null) }}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Dirección con botón de navegación y edición */}
              <div className="flex items-start gap-2 mb-4">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground flex-1">{modalStop.direccionTexto}</p>
                <div className="flex gap-1 shrink-0">
                  {modalStop.id_direccion && (
                    <button
                      type="button"
                      onClick={() => setEditandoUbicacion(modalStop)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Editar ubicación"
                    >
                      <Navigation className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openInMaps(modalStop)}
                    className="text-blue-600 hover:text-blue-700"
                    title="Abrir en Google Maps"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Productos del pedido */}
              {modalStop.productos.length > 0 && (
                <div className="mb-4 max-h-40 overflow-y-auto">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Package className="h-3 w-3" /> Productos
                  </p>
                  <div className="space-y-1">
                    {modalStop.productos.map((prod, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>
                          {prod.cantidad}× {prod.nombre}
                          {prod.cuadrado && ' (Cuadrado)'}
                          {prod.rebanado && ' (Rebanado)'}
                        </span>
                        <span className="font-medium">₡{prod.sub_total.toLocaleString('es-CR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total y estado */}
              <div className="flex items-center justify-between py-2 border-t border-b mb-4">
                <span className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Total
                </span>
                <span className="font-bold">₡{modalStop.total.toLocaleString('es-CR')}</span>
              </div>

              {/* Badges de estado */}
              <div className="flex gap-2 mb-4">
                <Badge
                  variant="outline"
                  className={modalStop.entregado
                    ? 'text-green-700 border-green-300 bg-green-50 dark:bg-green-950/30'
                    : 'text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950/30'}
                >
                  {modalStop.entregado ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                  {modalStop.entregado ? 'Entregado' : 'Pendiente'}
                </Badge>
                <Badge
                  variant="outline"
                  className={modalStop.pagado
                    ? 'text-green-700 border-green-300 bg-green-50 dark:bg-green-950/30'
                    : 'text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30'}
                >
                  {modalStop.pagado ? 'Pagado' : 'Sin pagar'}
                </Badge>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant={modalStop.entregado ? 'outline' : 'default'}
                  disabled={modalStop.entregado}
                  onClick={() => handleMarcarEntregado(modalStop)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {modalStop.entregado ? 'Entregado' : 'Marcar entregado'}
                </Button>
                <Button
                  className="flex-1"
                  variant={modalStop.pagado ? 'outline' : 'default'}
                  disabled={modalStop.pagado}
                  onClick={() => handleMarcarPagado(modalStop)}
                >
                  <DollarSign className="h-4 w-4 mr-1.5" />
                  {modalStop.pagado ? 'Pagado' : 'Marcar pagado'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Tarjeta individual de parada en el panel lateral
function StopCard({
  stop, isSelected, inOrden, onSelect, onNavigate, noCoords = false, onEditarUbicacion,
}: {
  stop: PedidoStop
  isSelected: boolean
  inOrden: boolean
  onSelect: () => void
  onNavigate: () => void
  noCoords?: boolean
  onEditarUbicacion?: () => void
}) {
  return (
    <Card
      className={[
        'cursor-pointer border transition-all',
        isSelected ? 'border-primary shadow-md' : 'hover:shadow-sm hover:border-border/80',
        noCoords ? 'opacity-60' : '',
        inOrden ? 'ring-1 ring-primary/40' : '',
      ].join(' ')}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {/* Indicador de estado */}
            <div
              className={[
                'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white mt-0.5',
                stop.entregado && stop.pagado ? 'bg-green-500' :
                stop.entregado ? 'bg-blue-500' :
                stop.pagado ? 'bg-purple-500' : 'bg-orange-500',
              ].join(' ')}
            >
              {stop.posicion}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{stop.clienteNombre}</p>
              <p className="text-xs text-muted-foreground truncate">{stop.direccionTexto}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs font-medium">₡{stop.total.toLocaleString('es-CR')}</span>
                {stop.entregado ? (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-green-700 border-green-200 bg-green-50 dark:bg-green-950/30">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Entregado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30">
                    <Clock className="h-2.5 w-2.5 mr-0.5" />Pendiente
                  </Badge>
                )}
                {!stop.pagado && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30">
                    Sin pagar
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {/* Botones de acción */}
          <div className="flex shrink-0 gap-0.5">
            {noCoords && onEditarUbicacion && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEditarUbicacion() }}
                className="p-1.5 rounded-md text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors text-xs font-medium"
                title="Agregar ubicación"
              >
                <MapPin className="h-3.5 w-3.5" />
              </button>
            )}
            {!noCoords && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onNavigate() }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Abrir en Google Maps"
              >
                <Navigation className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
