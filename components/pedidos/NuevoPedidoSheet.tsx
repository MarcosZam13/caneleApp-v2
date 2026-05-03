// NuevoPedidoSheet.tsx — Sheet para crear un nuevo pedido con wizard de 3 pasos
'use client'

import { useState, useTransition, useMemo, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { PlusCircle, Trash2, Loader2, ShoppingCart, ArrowLeft, ArrowRight, Check, User, Package2, ClipboardList, Search, MapPin, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getDireccionesPorCliente } from '@/actions/clientes.actions'
import { getProductosConPrecio } from '@/actions/productos.actions'
import { crearPedido } from '@/actions/pedidos.actions'

type ClienteOpt = { id_cliente: string; nombre: string }
type RutaOpt = { id_ruta: string; nombre: string | null; fecha: string | null }
type DireccionOpt = { id_direccion: string; direccion_texto: string | null }
type ProductoOpt = {
  id_producto: string
  nombre: string
  peso: string | null
  precio_efectivo: number
  tiene_precio_especial: boolean
}
type ItemForm = {
  localId: string
  id_producto: string
  cantidad: number
  rebanado: boolean
  cuadrado: boolean
  precio_unitario: number
}

interface NuevoPedidoSheetProps {
  clientes: ClienteOpt[]
  rutas: RutaOpt[]
}

const STEPS = [
  { id: 1, label: 'Cliente y Ruta', icon: User },
  { id: 2, label: 'Productos', icon: Package2 },
  { id: 3, label: 'Confirmar', icon: ClipboardList },
]

function emptyItem(): ItemForm {
  return {
    localId: crypto.randomUUID(),
    id_producto: '',
    cantidad: 1,
    rebanado: false,
    cuadrado: false,
    precio_unitario: 0,
  }
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, idx) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              step.id === current && 'bg-primary text-primary-foreground',
              step.id < current && 'bg-primary/15 text-primary',
              step.id > current && 'bg-muted text-muted-foreground',
            )}
          >
            <step.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={cn('h-px w-6', step.id < current ? 'bg-primary/40' : 'bg-muted-foreground/20')} />
          )}
        </div>
      ))}
    </div>
  )
}

function VariantLabel({ rebanado, cuadrado }: { rebanado: boolean; cuadrado: boolean }) {
  if (rebanado && cuadrado) return 'Cuadrado rebanado'
  if (rebanado) return 'Rebanado'
  if (cuadrado) return 'Cuadrado'
  return 'Entero'
}

export function NuevoPedidoSheet({ clientes, rutas }: NuevoPedidoSheetProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()

  // Campos del pedido
  const [idCliente, setIdCliente] = useState('')
  const [idRuta, setIdRuta] = useState('')
  const [idDireccion, setIdDireccion] = useState('')
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<ItemForm[]>([emptyItem()])

  // Search states para cliente y ruta
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteOpen, setClienteOpen] = useState(false)
  const clienteRef = useRef<HTMLDivElement>(null)

  const [rutaSearch, setRutaSearch] = useState('')
  const [rutaOpen, setRutaOpen] = useState(false)
  const rutaRef = useRef<HTMLDivElement>(null)

  // Datos cargados dinámicamente al seleccionar el cliente
  const [direcciones, setDirecciones] = useState<DireccionOpt[]>([])
  const [productos, setProductos] = useState<ProductoOpt[]>([])
  const [loadingCliente, setLoadingCliente] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = items.reduce((acc, i) => acc + i.cantidad * i.precio_unitario, 0)
  const validItems = useMemo(() => items.filter(i => i.id_producto !== ''), [items])
  const clienteSeleccionado = useMemo(
    () => clientes.find(c => c.id_cliente === idCliente),
    [clientes, idCliente],
  )
  const rutaSeleccionada = useMemo(
    () => rutas.find(r => r.id_ruta === idRuta),
    [rutas, idRuta],
  )

  // Filtrado de clientes para el buscador
  const clientesFiltrados = useMemo(() => {
    const q = clienteSearch.toLowerCase()
    return clientes.filter(c => c.nombre.toLowerCase().includes(q))
  }, [clientes, clienteSearch])

  // Filtrado de rutas
  const rutasFiltradas = useMemo(() => {
    const q = rutaSearch.toLowerCase()
    return rutas.filter(r => (r.nombre ?? '').toLowerCase().includes(q))
  }, [rutas, rutaSearch])

  // Cerrar dropdowns al clickear fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) {
        setClienteOpen(false)
      }
      if (rutaRef.current && !rutaRef.current.contains(e.target as Node)) {
        setRutaOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function reset() {
    setIdCliente('')
    setIdRuta('')
    setIdDireccion('')
    setFecha(format(new Date(), 'yyyy-MM-dd'))
    setNotas('')
    setItems([emptyItem()])
    setDirecciones([])
    setProductos([])
    setClienteSearch('')
    setRutaSearch('')
    setError(null)
    setStep(1)
  }

  async function handleClienteChange(id: string) {
    setIdCliente(id)
    setIdDireccion('')
    setItems([emptyItem()])
    setError(null)
    setLoadingCliente(true)

    const [dirs, prods] = await Promise.all([
      getDireccionesPorCliente(id),
      getProductosConPrecio(id),
    ])

    setDirecciones(dirs)
    setProductos(prods)
    setLoadingCliente(false)
  }

  function handleSelectCliente(id: string) {
    const c = clientes.find(cc => cc.id_cliente === id)
    setClienteSearch(c?.nombre ?? '')
    setClienteOpen(false)
    if (id !== idCliente) handleClienteChange(id)
  }

  function handleSelectRuta(id: string) {
    const r = rutas.find(rr => rr.id_ruta === id)
    setRutaSearch(r?.nombre ?? '')
    setRutaOpen(false)
    setIdRuta(id)
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()])
  }

  function removeItem(localId: string) {
    setItems(prev => prev.filter(i => i.localId !== localId))
  }

  function updateItem(localId: string, field: keyof Omit<ItemForm, 'localId'>, value: unknown) {
    setItems(prev => prev.map(i => i.localId === localId ? { ...i, [field]: value } : i))
  }

  function handleProductoChange(localId: string, idProducto: string) {
    const prod = productos.find(p => p.id_producto === idProducto)
    setItems(prev => prev.map(i =>
      i.localId === localId
        ? { ...i, id_producto: idProducto, precio_unitario: prod?.precio_efectivo ?? 0 }
        : i
    ))
  }

  function canGoNext(): boolean {
    if (step === 1) return !!idCliente
    if (step === 2) return validItems.length > 0
    return true
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (validItems.length === 0) { setError('Agrega al menos un producto'); setStep(2); return }
    if (!idCliente) { setError('Selecciona un cliente'); setStep(1); return }

    startTransition(async () => {
      const result = await crearPedido({
        id_cliente: idCliente,
        id_ruta: idRuta || null,
        id_direccion: idDireccion || null,
        fecha,
        notas: notas || null,
        items: validItems.map(({ id_producto, cantidad, rebanado, cuadrado, precio_unitario }) => ({
          id_producto, cantidad, rebanado, cuadrado, precio_unitario,
        })),
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      toast.success('Pedido creado exitosamente')
      setOpen(false)
      reset()
    })
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) reset()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <PlusCircle className="h-4 w-4" />
        Nuevo pedido
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-2 border-b">
            <SheetTitle>Nuevo pedido</SheetTitle>
            <StepIndicator current={step} />
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* PASO 1: CLIENTE + RUTA */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-2">

                {/* Cliente — searchable combobox */}
                <div className="space-y-2" ref={clienteRef}>
                  <Label className="text-xs">Cliente *</Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Busca y selecciona un cliente. Se cargarán sus direcciones y precios automáticamente.
                  </p>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Escribe para buscar cliente..."
                        value={clienteOpen ? clienteSearch : (clienteSeleccionado?.nombre ?? '')}
                        onChange={(e) => { setClienteSearch(e.target.value); setClienteOpen(true) }}
                        onFocus={() => { setClienteOpen(true); if (clienteSeleccionado) setClienteSearch('') }}
                      />
                      {idCliente && !clienteOpen && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => { setIdCliente(''); setClienteSearch(''); setDirecciones([]); setProductos([]) }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {clienteOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-auto">
                        {clientesFiltrados.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                            No se encontraron clientes
                          </p>
                        ) : (
                          clientesFiltrados.slice(0, 50).map((c) => (
                            <button
                              key={c.id_cliente}
                              type="button"
                              className={cn(
                                'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
                                c.id_cliente === idCliente && 'bg-accent font-medium',
                              )}
                              onClick={() => handleSelectCliente(c.id_cliente)}
                            >
                              {c.nombre}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ruta — searchable combobox */}
                <div className="space-y-2" ref={rutaRef}>
                  <Label className="text-xs">Ruta *</Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Cada pedido debe asignarse a una ruta de entrega.
                  </p>
                  <div className="relative">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Escribe para buscar ruta..."
                        value={rutaOpen ? rutaSearch : (rutaSeleccionada?.nombre ?? '')}
                        onChange={(e) => { setRutaSearch(e.target.value); setRutaOpen(true) }}
                        onFocus={() => { setRutaOpen(true); if (rutaSeleccionada) setRutaSearch('') }}
                      />
                      {idRuta && !rutaOpen && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => { setIdRuta(''); setRutaSearch('') }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {rutaOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-auto">
                        {rutasFiltradas.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                            No se encontraron rutas
                          </p>
                        ) : (
                          rutasFiltradas.slice(0, 50).map((r) => (
                            <button
                              key={r.id_ruta}
                              type="button"
                              className={cn(
                                'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between',
                                r.id_ruta === idRuta && 'bg-accent font-medium',
                              )}
                              onClick={() => handleSelectRuta(r.id_ruta)}
                            >
                              <span>{r.nombre ?? 'Sin nombre'}</span>
                              {r.fecha && (
                                <span className="text-xs text-muted-foreground">{r.fecha}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Loading estado */}
                {loadingCliente && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Cargando direcciones y precios...
                  </div>
                )}

                {/* Dirección — dropdown que muestra el texto, no el UUID */}
                {!loadingCliente && idCliente && direcciones.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dirección de entrega (opcional)</Label>
                    <Select
                      value={idDireccion || '__none__'}
                      onValueChange={v => setIdDireccion((v === '__none__' || !v) ? '' : v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue>
                          {idDireccion
                            ? (direcciones.find(d => d.id_direccion === idDireccion)?.direccion_texto ?? 'Dirección seleccionada')
                            : 'Sin dirección específica'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin dirección específica</SelectItem>
                        {direcciones.map(d => (
                          <SelectItem key={d.id_direccion} value={d.id_direccion}>
                            {d.direccion_texto ?? 'Sin descripción'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Confirmación de carga */}
                {!loadingCliente && idCliente && productos.length > 0 && (
                  <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 flex items-center gap-2">
                    <Check className="h-3.5 w-3.5" />
                    {productos.length} productos disponibles con precios para {clienteSeleccionado?.nombre}
                  </div>
                )}
              </div>
            )}

            {/* PASO 2: PRODUCTOS */}
            {step === 2 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Productos del pedido</h3>
                    <p className="text-xs text-muted-foreground">
                      {clienteSeleccionado ? `Cliente: ${clienteSeleccionado.nombre}` : ''}
                      {rutaSeleccionada ? ` · Ruta: ${rutaSeleccionada.nombre}` : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {validItems.length} producto{validItems.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {!idCliente || loadingCliente ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Selecciona un cliente primero en el paso anterior.
                  </p>
                ) : productos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No hay productos disponibles. Crea productos primero desde la sección Productos.
                  </p>
                ) : (
                  <>
                    {items.map((item, idx) => (
                      <div key={item.localId} className="rounded-lg border p-3 space-y-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Producto {idx + 1}</span>
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => removeItem(item.localId)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        <Select
                          value={item.id_producto || '__none__'}
                          onValueChange={id => { if (id && id !== '__none__') handleProductoChange(item.localId, id) }}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Selecciona un producto...">
                              {item.id_producto
                                ? (productos.find(p => p.id_producto === item.id_producto)?.nombre ?? 'Producto seleccionado')
                                : 'Selecciona un producto...'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="min-w-[320px]">
                            {productos.map(p => (
                              <SelectItem key={p.id_producto} value={p.id_producto}>
                                <div className="flex items-center justify-between gap-3 w-full pr-1">
                                  <span className="truncate">{p.nombre}</span>
                                  <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                                    ₡{p.precio_efectivo.toLocaleString('es-CR')}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Cantidad</Label>
                            <Input
                              type="number"
                              min={1}
                              className="h-8 text-sm"
                              value={item.cantidad}
                              onChange={e =>
                                updateItem(item.localId, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Precio unitario (₡)</Label>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 text-sm"
                              value={item.precio_unitario}
                              onChange={e =>
                                updateItem(item.localId, 'precio_unitario', parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Switch size="sm" checked={item.rebanado} onCheckedChange={(c) => updateItem(item.localId, 'rebanado', c)} />
                            <Label className="text-xs">Rebanado</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch size="sm" checked={item.cuadrado} onCheckedChange={(c) => updateItem(item.localId, 'cuadrado', c)} />
                            <Label className="text-xs">Cuadrado</Label>
                          </div>
                          {item.id_producto !== '' && (
                            <div className="ml-auto text-right">
                              <VariantLabel rebanado={item.rebanado} cuadrado={item.cuadrado} />
                              <p className="text-sm font-bold">₡{(item.cantidad * item.precio_unitario).toLocaleString('es-CR')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <Button type="button" variant="outline" className="w-full gap-2 text-sm" onClick={addItem}>
                      <PlusCircle className="h-4 w-4" /> Agregar producto
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* PASO 3: CONFIRMAR */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-2">
                <h3 className="text-sm font-semibold">Resumen del pedido</h3>

                <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium">{clienteSeleccionado?.nombre ?? 'No seleccionado'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ruta</span>
                    <span className="font-medium">{rutaSeleccionada?.nombre ?? 'Sin asignar'}</span>
                  </div>
                  {idDireccion && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dirección</span>
                      <span className="font-medium">
                        {direcciones.find(d => d.id_direccion === idDireccion)?.direccion_texto ?? 'Seleccionada'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Productos</span>
                    <span className="font-medium">{validItems.length}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span>₡{total.toLocaleString('es-CR')}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Productos en este pedido</p>
                  {validItems.map((item, idx) => {
                    const prod = productos.find(p => p.id_producto === item.id_producto)
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs bg-muted/20 rounded px-3 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate">{prod?.nombre ?? 'Producto'}</span>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1">
                            <VariantLabel rebanado={item.rebanado} cuadrado={item.cuadrado} />
                          </Badge>
                        </div>
                        <span className="font-medium text-muted-foreground shrink-0 ml-2">
                          {item.cantidad} x ₡{item.precio_unitario.toLocaleString('es-CR')}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fecha" className="text-xs">Fecha *</Label>
                  <Input id="fecha" type="date" className="text-sm" value={fecha} onChange={e => setFecha(e.target.value)} required />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notas" className="text-xs">Notas</Label>
                  <textarea id="notas" className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none disabled:opacity-50" placeholder="Instrucciones especiales, hora de entrega..." value={notas} onChange={e => setNotas(e.target.value)} />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}

            {/* Navegación */}
            <div className="flex items-center gap-3 pt-2">
              {step > 1 && (
                <Button type="button" variant="outline" className="gap-2 text-sm" onClick={() => setStep(s => s - 1)}>
                  <ArrowLeft className="h-4 w-4" /> Anterior
                </Button>
              )}
              {step < 3 ? (
                <Button type="button" className="gap-2 ml-auto text-sm" onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}>
                  Siguiente <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" className="gap-2 ml-auto text-sm" disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                  {isPending ? 'Creando pedido...' : `Crear pedido${total > 0 ? ` · ₡${total.toLocaleString('es-CR')}` : ''}`}
                </Button>
              )}
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
