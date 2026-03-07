# Marble Sales Website

Guia tecnica y de negocio para evolucionar el sistema del taller de marmol.

## 1) Resumen ejecutivo

Este proyecto combina:

- Landing comercial (marca, seleccion de productos, carrito rapido a WhatsApp).
- Panel administrativo (inventario, produccion, ventas, pagos, finanzas, contabilidad, mermas, trabajadores, catalogo, bloques/lotes).

El dominio de negocio esta bien definido en tipos y pantallas, pero la implementacion actual es principalmente **mock/local** (estado en memoria o `localStorage`) y aun no ejecuta varias reglas operativas clave entre modulos.

## 2) Stack actual

- Next.js 16 + React 19 + TypeScript.
- UI basada en componentes tipo shadcn/radix.
- Persistencia parcial en `localStorage`.
- Sin backend/API real ni base de datos.

Rutas principales:

- Landing: `app/page.tsx`
- Admin auth/layout: `app/admin/layout.tsx`
- Modulos admin: `app/admin/*/page.tsx`
- Dominio base: `lib/types.ts`, `lib/data.ts`, `lib/admin-auth.ts`, `lib/workshops.ts`

## 3) Modelo de negocio actual (dominio)

Entidades principales:

- `BloqueOLote`: materia prima de origen (`lib/types.ts`).
- `ProduccionDiaria`: acciones por obrero (`picar`, `pulir`, `escuadrar`) y pago asociado.
- `Producto` (inventario): stock por losas, m2, precio, estado y origen.
- `Venta`: venta por m2 con descuento y fondo operativo.
- `Merma`: perdida en m2 por motivo.
- `Trabajador`: datos, rol, tarifas personalizadas y acumulados.
- `HistorialPago`: pagos liquidados por lote de producciones.
- `ConfiguracionSistema`: tarifas globales y precios por dimension/estado.
- `SystemLog`: bitacora operacional.
- `WorkshopTenant`: talleres para modelo multi-sede.

Reglas de negocio declaradas (intencion):

- Produccion alimenta inventario.
- Ventas descuentan inventario.
- Mermas restan disponibilidad real.
- Pagos liquida producciones pendientes.
- Roles controlan acceso por modulo.
- Super Admin selecciona taller antes de operar.

## 4) Flujo actual por modulo (AS-IS)

### 4.1 Materia prima (`app/admin/bloques/page.tsx`)

- Crea/edita/elimina bloques/lotes en estado local del modulo.
- Regla especial: solo `Administrador` o registros del dia pueden modificarse.
- Problema: `Super Admin` no entra en `isAdmin`, queda limitado por fecha.

### 4.2 Produccion (`app/admin/produccion/page.tsx`)

- Registra produccion por accion y calcula pago con tarifas globales de configuracion.
- Genera multiples registros por formulario (uno por accion con cantidad > 0).
- Problemas:
  - No usa tarifas personalizadas del trabajador.
  - No actualiza inventario.
  - No actualiza bloque/lote (losas producidas, vendibles, perdidas).
  - Estado solo local de la pantalla.

### 4.3 Inventario (`app/admin/inventario/page.tsx`)

- CRUD de productos con conversion losas->m2 y precios por configuracion.
- Se persiste en `localStorage` via `useInventarioStore`.
- Problemas:
  - Se permite crear manualmente (rompe regla "solo desde produccion").
  - No recibe ajustes automaticos desde produccion/ventas/mermas.

### 4.4 Ventas (`app/admin/ventas/page.tsx`)

- Crea venta en m2, calcula subtotal/descuento/fondo/total.
- Lee productos desde `useInventarioStore`.
- Problemas:
  - No valida stock disponible real antes de vender.
  - No descuenta inventario al completar venta.
  - Estado de ventas es local del modulo (no persiste ni sincroniza con finanzas).

### 4.5 Mermas (`app/admin/mermas/page.tsx`)

- Registra perdidas en m2 por motivo.
- Problemas:
  - No descuenta inventario.
  - No impacta indicadores de bloque/lote.
  - Estado local del modulo.

### 4.6 Pagos (`app/admin/pagos/page.tsx`)

- Calcula pendientes por trabajador desde produccion no pagada.
- Genera `HistorialPago`, marca producciones como pagadas y actualiza totales del trabajador.
- Problemas:
  - Cambios quedan solo en estado local del modulo.
  - Contabilidad/finanzas usan `lib/data.ts` estatico, por lo que no reflejan pagos hechos en esta vista.

### 4.7 Trabajadores (`app/admin/trabajadores/page.tsx`)

- CRUD basico con restricciones de gestion por rol (`canManageWorkers`).
- Vista detalle con historico de produccion/pagos (desde datos mock).
- Problemas:
  - Mezcla estado editable con datos iniciales estaticos para historicos.
  - No hay fuente unica compartida con produccion/pagos reales del usuario.

### 4.8 Catalogo y landing

- Admin catalogo: `app/admin/catalogo/page.tsx` (estado local).
- Landing carrito rapido: `components/landing/quick-cart.tsx` usa `catalogoItems` estatico.
- Problema: cambios en catalogo admin no se reflejan en landing.

### 4.9 Auth, roles y talleres

- Auth demo en cliente con credenciales hardcodeadas (`lib/admin-auth.ts`).
- Sesion guardada en `localStorage`.
- Seleccion de taller para Super Admin (`app/admin/layout.tsx` + `components/admin/workshop-selector.tsx`).
- Problemas:
  - No hay seguridad server-side.
  - Taller seleccionado no filtra datos del negocio.
  - Talleres nuevos no persisten (solo estado del layout).

## 5) Hallazgos criticos

1. No existe una fuente unica de verdad de negocio entre modulos.
2. Varias reglas operativas existen en texto/UI, pero no en transacciones reales de datos.
3. Persistencia parcial y fragmentada (`useState` local + `localStorage` en pocos modulos).
4. Modelo multi-taller incompleto (selector sin aislamiento de datos).
5. Seguridad solo de demo (credenciales en frontend y control de rutas en cliente).
6. Generacion de IDs por `length + 1` (riesgo de colisiones tras eliminar registros).
7. Estado financiero no sincronizado con operaciones recientes.

## 6) Calidad tecnica observada

Comando ejecutado: `npx tsc --noEmit`

Errores relevantes:

- `app/admin/produccion/page.tsx`: tipado de `AccionLosa`.
- `app/admin/trabajadores/page.tsx`: al crear trabajador faltan campos obligatorios (`tarifasPersonalizadas`, `acumuladoPendiente`).
- `components/admin/dashboard-tables.tsx`: usa `m.cantidadLosas` en `Merma` (campo inexistente).
- Adicional: errores por tipos stale en `.next/types/validator.ts` apuntando a rutas inexistentes.

Tambien:

- `npm run lint` falla porque `eslint` no esta instalado en dependencias.

## 7) Mejoras prioritarias (recomendadas)

### P0 (inmediato)

- Centralizar estado de negocio en un solo store temporal (cliente) mientras llega backend.
- Implementar movimientos de inventario como eventos/ledger:
  - `PRODUCCION_ENTRADA`
  - `VENTA_SALIDA`
  - `MERMA_SALIDA`
  - `AJUSTE_MANUAL`
- Ejecutar validaciones duras:
  - No vender m2 sin stock.
  - No registrar mermas negativas.
  - No duplicar IDs.
- Corregir tipado TypeScript y limpiar `.next` para evitar falsos errores.
- Incluir `eslint` y pipeline minima de calidad.

### P1 (corto plazo)

- Backend real (API + DB relacional) con transacciones.
- Migrar auth a servidor (JWT/session segura, hash de password, roles en DB).
- Persistir todos los modulos (ventas, pagos, produccion, mermas, bloques, catalogo, trabajadores).
- Activar verdadero multi-tenant:
  - Todas las tablas con `workshopId`.
  - Filtrado obligatorio por taller activo.

### P2 (mediano plazo)

- Auditoria completa de cambios (quien, que, cuando).
- Dashboards KPI confiables y comparables por taller/periodo.
- Automatizacion de alertas (stock bajo, merma alta, nomina pendiente).

## 8) Integraciones utiles para este negocio

- Base de datos: PostgreSQL + Prisma.
- Auth/roles: NextAuth o proveedor externo (Clerk/Auth0).
- Notificaciones: Email transaccional (Resend/SendGrid) + WhatsApp Business API.
- Observabilidad: Sentry (errores) + logs estructurados.
- BI/reportes: Metabase o dashboard SQL dedicado.
- Facturacion/ERP (segun operacion): integracion via webhooks/API con sistema contable.

## 9) Arquitectura objetivo (propuesta)

Capas:

1. `domain/` (reglas puras, sin UI)
2. `application/` (casos de uso y transacciones)
3. `infrastructure/` (DB, repositorios, integraciones)
4. `presentation/` (pages/components)

Casos de uso clave:

- `registrarProduccion()`
- `registrarVenta()`
- `registrarMerma()`
- `ejecutarPagoTrabajador()`
- `actualizarCatalogo()`

Cada caso de uso debe escribir:

- Evento de movimiento.
- Estado agregado actualizado.
- Log de auditoria.

## 10) Plan sugerido 30-60-90 dias

### 0-30 dias

- Corregir tipado/errores build.
- Unificar store en cliente.
- Implementar ledger de inventario y validaciones de stock.
- Sincronizar modulos admin entre si.

### 31-60 dias

- Diseñar esquema DB y migrar datos mock.
- Implementar APIs server actions/route handlers.
- Migrar auth y permisos a servidor.
- Introducir `workshopId` en todo el dominio.

### 61-90 dias

- Integraciones externas (WhatsApp API, email, contable).
- Alertas operativas automáticas.
- Reportes historicos y cierre de periodo.

## 11) KPIs recomendados

- Margen operativo y margen neto por taller.
- Merma % sobre m2 comprados.
- Rotacion de inventario (dias).
- M2 vendidos vs m2 producidos.
- Nomina pendiente / nomina total.
- Ticket promedio y tasa de descuento.

## 12) Proximos pasos concretos (accionables)

1. Corregir errores TypeScript y dejar `tsc --noEmit` en verde.
2. Implementar modulo de movimientos de inventario compartido por produccion/ventas/mermas.
3. Persistir ventas, pagos y produccion en un store comun (temporal) y luego en DB.
4. Reemplazar auth mock por auth server-side.
5. Activar aislamiento real por taller (`workshopId`) en todas las consultas.

## 13) Backlog ejecutable por archivo

El backlog tecnico detallado (con checklist por fase y por archivo) esta en:

- `BACKLOG.md`

---

Siguiente paso recomendado: ejecutar la `Fase 0` de `BACKLOG.md` para dejar base tecnica estable antes de mover logica de negocio.
