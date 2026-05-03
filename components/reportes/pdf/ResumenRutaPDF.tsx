// ResumenRutaPDF.tsx — Documento PDF con el resumen diario de una ruta, listo para imprimir
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PedidoRutaPDF {
  cliente_nombre: string
  direccion: string
  total: number
  items: string[]
  notas: string | null
}

interface ResumenRutaPDFProps {
  ruta: {
    nombre: string
    fecha: string
  }
  pedidos: PedidoRutaPDF[]
  totalIngresos: number
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: '3px solid #333',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
    marginBottom: 4,
  },
  rutaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rutaNombre: {
    fontSize: 12,
    color: '#555',
  },
  rutaFecha: {
    fontSize: 12,
    color: '#555',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '2px solid #ccc',
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #eee',
    paddingVertical: 6,
    minHeight: 28,
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
    fontSize: 9,
    color: '#666',
  },
  rightAlign: {
    textAlign: 'right',
  },
  colNum: {
    width: 32,
    paddingRight: 8,
  },
  colCliente: {
    flex: 2.5,
    paddingRight: 8,
  },
  colDireccion: {
    flex: 2,
    paddingRight: 8,
  },
  colItems: {
    flex: 2.5,
    paddingRight: 8,
  },
  colTotal: {
    flex: 1.5,
  },
  itemsList: {
    flexDirection: 'column',
    gap: 1,
  },
  itemText: {
    fontSize: 9,
    color: '#555',
  },
  notasText: {
    fontSize: 8,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
  },
  footerDivider: {
    borderTop: '2px solid #333',
    marginBottom: 8,
  },
  footerTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
  },
  footerValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
  },
  footerMeta: {
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    marginTop: 6,
  },
})

// ─── Componente ───────────────────────────────────────────────────────────────

export function ResumenRutaPDF({
  ruta,
  pedidos,
  totalIngresos,
}: ResumenRutaPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado del documento */}
        <View style={styles.header}>
          <Text style={styles.title}>Resumen de Ruta — {ruta.nombre}</Text>
          <View style={styles.rutaInfo}>
            <Text style={styles.rutaNombre}>Ruta: {ruta.nombre}</Text>
            <Text style={styles.rutaFecha}>Fecha: {ruta.fecha}</Text>
          </View>
        </View>

        {/* Encabezado de tabla */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.colNum, styles.rightAlign]}>
            #
          </Text>
          <Text style={[styles.headerCell, styles.colCliente]}>Cliente</Text>
          <Text style={[styles.headerCell, styles.colDireccion]}>Dirección</Text>
          <Text style={[styles.headerCell, styles.colItems]}>Productos</Text>
          <Text style={[styles.headerCell, styles.colTotal, styles.rightAlign]}>
            Total
          </Text>
        </View>

        {/* Paradas de la ruta */}
        {pedidos.map((pedido, idx) => (
          <View style={styles.tableRow} key={idx} wrap={false}>
            <Text style={[styles.cell, styles.colNum, styles.rightAlign]}>
              {idx + 1}
            </Text>
            <View style={styles.colCliente}>
              <Text style={styles.cell}>{pedido.cliente_nombre}</Text>
              {pedido.notas && (
                <Text style={styles.notasText}>{pedido.notas}</Text>
              )}
            </View>
            <Text style={[styles.mutedCell, styles.colDireccion]}>
              {pedido.direccion || '—'}
            </Text>
            <View style={styles.colItems}>
              <View style={styles.itemsList}>
                {pedido.items.map((item, i) => (
                  <Text key={i} style={styles.itemText}>
                    • {item}
                  </Text>
                ))}
              </View>
            </View>
            <Text style={[styles.cell, styles.colTotal, styles.rightAlign]}>
              ₡{pedido.total.toLocaleString('es-CR')}
            </Text>
          </View>
        ))}

        {/* Pie de página con total */}
        <View style={styles.footer} fixed>
          <View style={styles.footerDivider} />
          <View style={styles.footerTotalRow}>
            <Text style={styles.footerLabel}>
              Total ingresos ({pedidos.length}{' '}
              {pedidos.length === 1 ? 'parada' : 'paradas'})
            </Text>
            <Text style={styles.footerValue}>
              ₡{totalIngresos.toLocaleString('es-CR')}
            </Text>
          </View>
          <Text style={styles.footerMeta}>
            Canelé — Resumen de Ruta — {ruta.fecha}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
