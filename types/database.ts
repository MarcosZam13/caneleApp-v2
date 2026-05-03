// database.ts — Tipos TypeScript generados desde Supabase CLI (CaneleAPP)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cliente: {
        Row: {
          created_at: string | null
          email: string | null
          id_cliente: string
          nombre: string
          observaciones: string | null
          telefono: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id_cliente?: string
          nombre: string
          observaciones?: string | null
          telefono?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id_cliente?: string
          nombre?: string
          observaciones?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      direccion: {
        Row: {
          activa: boolean | null
          Canton: string | null
          created_at: string | null
          direccion_texto: string | null
          Distrito: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id_cliente: string | null
          id_direccion: string
          lat: number | null
          lng: number | null
          Provincia: string | null
        }
        Insert: {
          activa?: boolean | null
          Canton?: string | null
          created_at?: string | null
          direccion_texto?: string | null
          Distrito?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id_cliente?: string | null
          id_direccion?: string
          lat?: number | null
          lng?: number | null
          Provincia?: string | null
        }
        Update: {
          activa?: boolean | null
          Canton?: string | null
          created_at?: string | null
          direccion_texto?: string | null
          Distrito?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id_cliente?: string | null
          id_direccion?: string
          lat?: number | null
          lng?: number | null
          Provincia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direccion_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      orden_entrega: {
        Row: {
          creado: string
          id_orden: string
          id_pedido: string | null
          id_ruta: string | null
          posicion: number
        }
        Insert: {
          creado?: string
          id_orden?: string
          id_pedido?: string | null
          id_ruta?: string | null
          posicion: number
        }
        Update: {
          creado?: string
          id_orden?: string
          id_pedido?: string | null
          id_ruta?: string | null
          posicion?: number
        }
        Relationships: [
          {
            foreignKeyName: "orden_entrega_id_pedido_fkey"
            columns: ["id_pedido"]
            isOneToOne: false
            referencedRelation: "pedido"
            referencedColumns: ["id_pedido"]
          },
          {
            foreignKeyName: "orden_entrega_id_ruta_fkey"
            columns: ["id_ruta"]
            isOneToOne: false
            referencedRelation: "ruta"
            referencedColumns: ["id_ruta"]
          },
        ]
      }
      pago: {
        Row: {
          fecha: string | null
          id_cliente: string | null
          id_pago: string
          id_pedido: string | null
          metodo: string | null
          monto: number
        }
        Insert: {
          fecha?: string | null
          id_cliente?: string | null
          id_pago?: string
          id_pedido?: string | null
          metodo?: string | null
          monto: number
        }
        Update: {
          fecha?: string | null
          id_cliente?: string | null
          id_pago?: string
          id_pedido?: string | null
          metodo?: string | null
          monto?: number
        }
        Relationships: [
          {
            foreignKeyName: "pago_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "pago_id_pedido_fkey"
            columns: ["id_pedido"]
            isOneToOne: false
            referencedRelation: "pedido"
            referencedColumns: ["id_pedido"]
          },
        ]
      }
      pedido: {
        Row: {
          created_at: string | null
          entregado: boolean | null
          fecha: string | null
          id_cliente: string | null
          id_direccion: string | null
          id_pedido: string
          id_ruta: string | null
          notas: string | null
          pagado: boolean | null
          total: number | null
        }
        Insert: {
          created_at?: string | null
          entregado?: boolean | null
          fecha?: string | null
          id_cliente?: string | null
          id_direccion?: string | null
          id_pedido?: string
          id_ruta?: string | null
          notas?: string | null
          pagado?: boolean | null
          total?: number | null
        }
        Update: {
          created_at?: string | null
          entregado?: boolean | null
          fecha?: string | null
          id_cliente?: string | null
          id_direccion?: string | null
          id_pedido?: string
          id_ruta?: string | null
          notas?: string | null
          pagado?: boolean | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "pedido_id_direccion_fkey"
            columns: ["id_direccion"]
            isOneToOne: false
            referencedRelation: "direccion"
            referencedColumns: ["id_direccion"]
          },
          {
            foreignKeyName: "pedido_id_ruta_fkey"
            columns: ["id_ruta"]
            isOneToOne: false
            referencedRelation: "ruta"
            referencedColumns: ["id_ruta"]
          },
        ]
      }
      pedido_producto: {
        Row: {
          cantidad: number | null
          cuadrado: boolean | null
          id_pedido: string
          id_pedido_producto: string
          id_producto: string
          precio_unitario: number | null
          rebanado: boolean | null
          sub_total: number | null
        }
        Insert: {
          cantidad?: number | null
          cuadrado?: boolean | null
          id_pedido: string
          id_pedido_producto?: string
          id_producto: string
          precio_unitario?: number | null
          rebanado?: boolean | null
          sub_total?: number | null
        }
        Update: {
          cantidad?: number | null
          cuadrado?: boolean | null
          id_pedido?: string
          id_pedido_producto?: string
          id_producto?: string
          precio_unitario?: number | null
          rebanado?: boolean | null
          sub_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_producto_id_pedido_fkey"
            columns: ["id_pedido"]
            isOneToOne: false
            referencedRelation: "pedido"
            referencedColumns: ["id_pedido"]
          },
          {
            foreignKeyName: "pedido_producto_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "producto"
            referencedColumns: ["id_producto"]
          },
        ]
      }
      precio_producto: {
        Row: {
          id_cliente: string | null
          id_precio: string
          id_producto: string | null
          precio: number
        }
        Insert: {
          id_cliente?: string | null
          id_precio?: string
          id_producto?: string | null
          precio: number
        }
        Update: {
          id_cliente?: string | null
          id_precio?: string
          id_producto?: string | null
          precio?: number
        }
        Relationships: [
          {
            foreignKeyName: "precio_producto_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "precio_producto_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "producto"
            referencedColumns: ["id_producto"]
          },
        ]
      }
      producto: {
        Row: {
          created_at: string | null
          disponible: boolean | null
          id_producto: string
          imagen: string | null
          nombre: string
          peso: string | null
          precio_base: number | null
        }
        Insert: {
          created_at?: string | null
          disponible?: boolean | null
          id_producto?: string
          imagen?: string | null
          nombre: string
          peso?: string | null
          precio_base?: number | null
        }
        Update: {
          created_at?: string | null
          disponible?: boolean | null
          id_producto?: string
          imagen?: string | null
          nombre?: string
          peso?: string | null
          precio_base?: number | null
        }
        Relationships: []
      }
      ruta: {
        Row: {
          created_at: string | null
          estado: string | null
          fecha: string | null
          id_ruta: string
          nombre: string | null
          total_pedidos: number | null
          total_venta: number | null
        }
        Insert: {
          created_at?: string | null
          estado?: string | null
          fecha?: string | null
          id_ruta?: string
          nombre?: string | null
          total_pedidos?: number | null
          total_venta?: number | null
        }
        Update: {
          created_at?: string | null
          estado?: string | null
          fecha?: string | null
          id_ruta?: string
          nombre?: string | null
          total_pedidos?: number | null
          total_venta?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Tipos derivados convenientes
export type Cliente      = Database['public']['Tables']['cliente']['Row']
export type Direccion    = Database['public']['Tables']['direccion']['Row']
export type Producto     = Database['public']['Tables']['producto']['Row']
export type PrecioProducto = Database['public']['Tables']['precio_producto']['Row']
export type Ruta         = Database['public']['Tables']['ruta']['Row']
export type Pedido       = Database['public']['Tables']['pedido']['Row']
export type PedidoProducto = Database['public']['Tables']['pedido_producto']['Row']
export type Pago         = Database['public']['Tables']['pago']['Row']
export type OrdenEntrega = Database['public']['Tables']['orden_entrega']['Row']

// Tipos compuestos con joins frecuentes
export interface ClienteConBalance extends Cliente {
  total_deuda: number
  pedidos_morosos: number
}

export interface PedidoConCliente extends Pedido {
  cliente: Pick<Cliente, 'nombre' | 'telefono'> | null
  direccion: Pick<Direccion, 'direccion_texto' | 'lat' | 'lng'> | null
}
