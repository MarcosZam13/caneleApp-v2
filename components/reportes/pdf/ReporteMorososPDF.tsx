// ReporteMorososPDF.tsx — Documento PDF del reporte de clientes morosos
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MorosoPDF {
  id_pedido: string
  cliente_nombre: string
  total: number
  fecha: string
  dias_atraso: number
}

interface ReporteMorososPDFProps {
  morosos: MorosoPDF[]
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
    color: '#cc0000',
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
  colCliente: {
    flex: 3,
    paddingRight: 8,
  },
  colFecha: {
    flex: 1.5,
    paddingRight: 8,
  },
  colMonto: {
    flex: 2,
    paddingRight: 8,
  },
  colDias: {
    flex: 1.5,
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

// ─── Componente ───────────────────────────────────────────────────────────────

export function ReporteMorososPDF({ morosos }: ReporteMorososPDFProps) {
  const totalDeuda = morosos.reduce((acc, m) => acc + m.total, 0)
  const fechaHoy = format(new Date(), "dd 'de' MMMM yyyy", { locale: es })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Título */}
        <Text style={styles.title}>Reporte de Morosos</Text>
        <Text style={styles.subtitle}>Generado el {fechaHoy}</Text>

        {/* Totales */}
        <View style={styles.totalsRow}>
          <Text style={styles.totalLabel}>Clientes morosos: {morosos.length}</Text>
          <Text style={styles.totalValue}>
            Total deuda: ₡{totalDeuda.toLocaleString('es-CR')}
          </Text>
        </View>

        {/* Encabezado de tabla */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.colCliente]}>Cliente</Text>
          <Text style={[styles.headerCell, styles.colFecha]}>Fecha</Text>
          <Text style={[styles.headerCell, styles.colMonto, styles.rightAlign]}>
            Monto
          </Text>
          <Text style={[styles.headerCell, styles.colDias, styles.centerAlign]}>
            Días atraso
          </Text>
        </View>

        {/* Filas de datos */}
        {morosos.map((m) => (
          <View style={styles.tableRow} key={m.id_pedido}>
            <Text style={[styles.cell, styles.colCliente]}>
              {m.cliente_nombre || '—'}
            </Text>
            <Text style={[styles.mutedCell, styles.colFecha]}>
              {m.fecha
                ? format(parseISO(m.fecha + 'T12:00:00'), 'dd MMM yy', {
                    locale: es,
                  })
                : '—'}
            </Text>
            <Text style={[styles.cell, styles.colMonto, styles.rightAlign]}>
              ₡{m.total.toLocaleString('es-CR')}
            </Text>
            <Text style={[styles.cell, styles.colDias, styles.centerAlign]}>
              {m.dias_atraso}d
            </Text>
          </View>
        ))}

        {/* Pie de página */}
        <Text style={styles.footer} fixed>
          Canelé — Reporte de Morosos — {fechaHoy}
        </Text>
      </Page>
    </Document>
  )
}
