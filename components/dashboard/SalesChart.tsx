// SalesChart.tsx — Gráfica de ventas con selector de período (7 / 28 / 90 días)
'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface SalesData {
  fecha: string | null
  total_venta: number | null
}

interface SalesChartProps {
  data: SalesData[]
  currentPeriod: string
}

const PERIODS = [
  { value: '7', label: '7 días' },
  { value: '28', label: '28 días' },
  { value: '90', label: '90 días' },
]

function aggregateByDate(data: SalesData[]): { fecha: string; total: number }[] {
  const map = new Map<string, number>()

  for (const item of data) {
    if (!item.fecha) continue
    const current = map.get(item.fecha) ?? 0
    map.set(item.fecha, current + Number(item.total_venta ?? 0))
  }

  return Array.from(map.entries())
    .map(([fecha, total]) => ({ fecha, total }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-sm">
      <p className="text-muted-foreground font-medium">
        {label ? format(parseISO(label), 'dd MMM yyyy', { locale: es }) : ''}
      </p>
      <p className="text-primary font-bold mt-1">
        ₡{Number(payload[0].value).toLocaleString('es-CR')}
      </p>
    </div>
  )
}

export function SalesChart({ data, currentPeriod }: SalesChartProps) {
  const chartData = aggregateByDate(data)

  const total = chartData.reduce((acc, d) => acc + d.total, 0)
  const promedio = chartData.length > 0 ? total / chartData.length : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Ventas por día de ruta</CardTitle>
            <CardDescription>
              Total: ₡{total.toLocaleString('es-CR')} · Prom: ₡{Math.round(promedio).toLocaleString('es-CR')}/día
            </CardDescription>
          </div>
          <div className="flex rounded-md border overflow-hidden shrink-0">
            {PERIODS.map((p) => (
              <Link key={p.value} href={`/dashboard?period=${p.value}`} scroll={false}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'rounded-none px-3 h-8 text-xs font-medium',
                    p.value === currentPeriod
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  {p.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Sin datos suficientes para este período</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                tickFormatter={(v) => format(parseISO(v), 'dd/MM')}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                tickFormatter={(v) => `₡${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#salesGradient)"
                dot={false}
                activeDot={{ r: 4, fill: 'var(--color-primary)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
