// ReporteVentasPDF.tsx — Documento PDF del reporte de ventas por ruta
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RutaPDF {
  nombre: string
  fecha: string
  total_pedidos: number
  total_venta: number
  estado: string
}

interface ReporteVentasPDFProps {
  rutas: RutaPDF[]
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    color: '#111',
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 16,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#006600',
  },
  table: {
    width: 'auto',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '2px solid #ccc',
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #eee',
    paddingVertical: 4,
  },
  headerCell: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#333',
  },
  cell: {
    fontSize: 10,
    color: '#333',
  },
  mutedCell: {
    fontSize: 10,
    color: '#666',
  },
  rightAlign: {
    textAlign: 'right',
  },
  centerAlign: {
    textAlign: 'center',
  },
  colRuta: {
    flex: 2,
    paddingRight: 8,
  },
  colFecha: {
    flex: 1.5,
    paddingRight: 8,
  },
  colPedidos: {
    flex: 1.2,
    paddingRight: 8,
  },
  colVentas: {
    flex: 2,
    paddingRight: 8,
  },
  colEstado: {
    flex: 2,
  },
  summarySection: {
    marginTop: 16,
    borderTop: '2px solid #333',
    paddingTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#333',
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#333',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
})

/**
 * Traduce el estado a español para el PDF
 */
function estadoLabel(estado: string): string {
  const mapa: Record<string, string> = {
    pendiente: 'Pendiente',
    en_progreso: 'En progreso',
    completada: 'Completada',
    cancelada: 'Cancelada',
  }
  return mapa[estado] ?? estado
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ReporteVentasPDF({ rutas }: ReporteVentasPDFProps) {
  const totalVentas = rutas.reduce((acc, r) => acc + r.total_venta, 0)
  const totalPedidos = rutas.reduce((acc, r) => acc + r.total_pedidos, 0)
  const rutasCompletadas = rutas.filter((r) => r.estado === 'completada')
  const promedio =
    rutasCompletadas.length > 0
      ? rutasCompletadas.reduce((acc, r) => acc + r.total_venta, 0) /
        rutasCompletadas.length
      : 0

  const fechaHoy = format(new Date(), "dd 'de' MMMM yyyy", { locale: es })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Título */}
        <Text style={styles.title}>Reporte de Ventas por Ruta</Text>
        <Text style={styles.subtitle}>Generado el {fechaHoy}</Text>

        {/* Totales principales */}
        <View style={styles.totalsRow}>
          <Text style={styles.totalLabel}>
            Rutas activas: {rutas.length}
          </Text>
          <Text style={styles.totalValue}>
            Total: ₡{totalVentas.toLocaleString('es-CR')}
          </Text>
        </View>

        {/* Encabezado de tabla */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.colRuta]}>Ruta</Text>
          <Text style={[styles.headerCell, styles.colFecha]}>Fecha</Text>
          <Text style={[styles.headerCell, styles.colPedidos, styles.centerAlign]}>
            Pedidos
          </Text>
          <Text style={[styles.headerCell, styles.colVentas, styles.rightAlign]}>
            Ventas
          </Text>
          <Text style={[styles.headerCell, styles.colEstado]}>Estado</Text>
        </View>

        {/* Filas de datos */}
        {rutas.map((ruta, idx) => (
          <View style={styles.tableRow} key={idx}>
            <Text style={[styles.cell, styles.colRuta]}>
              {ruta.nombre || '—'}
            </Text>
            <Text style={[styles.mutedCell, styles.colFecha]}>
              {ruta.fecha
                ? format(parseISO(ruta.fecha + 'T12:00:00'), 'dd MMM yy', {
                    locale: es,
                  })
                : '—'}
            </Text>
            <Text style={[styles.cell, styles.colPedidos, styles.centerAlign]}>
              {ruta.total_pedidos}
            </Text>
            <Text style={[styles.cell, styles.colVentas, styles.rightAlign]}>
              ₡{ruta.total_venta.toLocaleString('es-CR')}
            </Text>
            <Text style={[styles.cell, styles.colEstado]}>
              {estadoLabel(ruta.estado)}
            </Text>
          </View>
        ))}

        {/* Resumen — totales finales */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total pedidos</Text>
            <Text style={styles.summaryValue}>{totalPedidos}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total ventas</Text>
            <Text style={styles.summaryValue}>
              ₡{totalVentas.toLocaleString('es-CR')}
            </Text>
          </View>
          {promedio > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Promedio por ruta</Text>
              <Text style={styles.summaryValue}>
                ₡{Math.round(promedio).toLocaleString('es-CR')}
              </Text>
            </View>
          )}
        </View>

        {/* Pie de página */}
        <Text style={styles.footer} fixed>
          Canelé — Reporte de Ventas por Ruta — {fechaHoy}
        </Text>
      </Page>
    </Document>
  )
}
