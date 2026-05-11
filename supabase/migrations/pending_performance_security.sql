-- ============================================================
-- MIGRACIÓN: Performance + Seguridad (pendiente de aprobación)
-- Generada: 2026-05-10
-- Aplicar en Supabase SQL Editor o con apply_migration
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ÍNDICES EN FOREIGN KEYS SIN ÍNDICE (performance)
--    Detectados por Supabase Advisor
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_direccion_id_cliente
  ON public.direccion(id_cliente);

CREATE INDEX IF NOT EXISTS idx_orden_entrega_id_pedido
  ON public.orden_entrega(id_pedido);

CREATE INDEX IF NOT EXISTS idx_orden_entrega_id_ruta
  ON public.orden_entrega(id_ruta);

CREATE INDEX IF NOT EXISTS idx_pedido_producto_id_producto
  ON public.pedido_producto(id_producto);

CREATE INDEX IF NOT EXISTS idx_precio_producto_id_producto
  ON public.precio_producto(id_producto);

-- ────────────────────────────────────────────────────────────
-- 2. ÍNDICES ADICIONALES DE CONSULTAS FRECUENTES (PLAN-MEJORAS 4.4)
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pedido_fecha
  ON public.pedido(fecha);

CREATE INDEX IF NOT EXISTS idx_pedido_id_cliente
  ON public.pedido(id_cliente);

CREATE INDEX IF NOT EXISTS idx_pedido_id_ruta
  ON public.pedido(id_ruta);

CREATE INDEX IF NOT EXISTS idx_pedido_entregado_pagado
  ON public.pedido(entregado, pagado);

CREATE INDEX IF NOT EXISTS idx_pago_id_cliente
  ON public.pago(id_cliente);

CREATE INDEX IF NOT EXISTS idx_pago_id_pedido
  ON public.pago(id_pedido);

-- ────────────────────────────────────────────────────────────
-- 3. FIX RLS INIT PLAN (performance)
--    Reemplaza auth.uid() con (select auth.uid()) en las
--    políticas service_role_full_access para evitar re-evaluación
--    por fila.
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbls text[] := ARRAY['cliente','direccion','producto','precio_producto','pedido','pedido_producto','ruta'];
  t text;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS service_role_full_access ON public.%I', t
    );
    EXECUTE format(
      $pol$
        CREATE POLICY service_role_full_access ON public.%I
          FOR ALL
          TO service_role
          USING ((select auth.uid()) IS NOT NULL OR current_setting(''request.jwt.role'', true) = ''service_role'')
          WITH CHECK (true)
      $pol$, t
    );
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- 4. FIX FUNCIONES CON SEARCH_PATH MUTABLE (seguridad)
-- ────────────────────────────────────────────────────────────
ALTER FUNCTION public.actualizar_total_pedido() SET search_path = public;
ALTER FUNCTION public.actualizar_totales_ruta() SET search_path = public;

-- ────────────────────────────────────────────────────────────
-- 5. FIX VISTAS SECURITY DEFINER (seguridad)
--    Las vistas vista_morosos y vista_balance_cliente tienen
--    SECURITY DEFINER, lo que hace que ignoren el RLS del usuario.
--    Para una app single-tenant con un solo usuario autenticado
--    esto es aceptable (no hay riesgo real), pero Supabase lo
--    marca como ERROR.
--
--    Para resolver: recrear las vistas con SECURITY INVOKER.
--    REQUIERE conocer el SQL original de las vistas.
--    Ejecutar este bloque SOLO si se tiene el SQL de las vistas:
--
--    CREATE OR REPLACE VIEW public.vista_morosos
--      WITH (security_invoker = true) AS
--      <SQL original de la vista>;
--
--    CREATE OR REPLACE VIEW public.vista_balance_cliente
--      WITH (security_invoker = true) AS
--      <SQL original de la vista>;
--
--    Para obtener el SQL original, ejecutar en Supabase SQL Editor:
--    SELECT definition FROM pg_views WHERE viewname = 'vista_morosos';
--    SELECT definition FROM pg_views WHERE viewname = 'vista_balance_cliente';
-- ────────────────────────────────────────────────────────────
