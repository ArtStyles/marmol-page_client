# Backlog Tecnico Ejecutable

Backlog operativo por archivo para evolucionar el proyecto de estado mock/local a una plataforma consistente de operacion.

## Como usar este backlog

- Marcar cada item con `[x]` al terminar.
- Ejecutar por fases en orden.
- No pasar a la siguiente fase sin cumplir los criterios de cierre.
- Cada tarea incluye archivos objetivo para reducir ambiguedad.

## Estado general

- Estado actual: `planning`
- Responsable recomendado: `1 dev full-stack + 1 apoyo QA`
- Horizonte sugerido: `6 a 10 semanas`

## Fase 0 - Estabilizacion tecnica (bloqueante)

### [ ] B00.1 Habilitar lint real del proyecto
Archivos:
- `package.json`
- `eslint.config.mjs` (nuevo)

Checklist:
- Agregar `eslint` y plugins requeridos.
- Configurar `npm run lint` para que ejecute sin error de comando faltante.
- Definir reglas minimas: `no-unused-vars`, `no-explicit-any` controlado, `react-hooks`.

Criterio de cierre:
- `npm run lint` ejecuta y reporta resultados validos.

### [ ] B00.2 Corregir error de tipado en produccion
Archivos:
- `app/admin/produccion/page.tsx`

Checklist:
- Tipar `accionesRegistradas` sin widening a `string`.
- Garantizar que `accion` se mantenga como `AccionLosa` en todo el flujo.

Criterio de cierre:
- El archivo compila sin error TS.

### [ ] B00.3 Corregir creacion de trabajador con campos obligatorios
Archivos:
- `app/admin/trabajadores/page.tsx`

Checklist:
- Incluir `tarifasPersonalizadas` y `acumuladoPendiente` al crear trabajador.
- Revisar que la rama de edicion no rompa contratos de tipo.

Criterio de cierre:
- El archivo compila sin error TS.

### [ ] B00.4 Corregir tabla de mermas en componente de dashboard
Archivos:
- `components/admin/dashboard-tables.tsx`
- `lib/types.ts` (solo si hace falta ajustar tipado auxiliar)

Checklist:
- Eliminar referencia a `cantidadLosas` en `Merma` (campo no existe).
- Mostrar `metrosCuadrados` con formato consistente.
- Validar si el componente se usa; si no se usa, decidir entre corregirlo o eliminarlo.

Criterio de cierre:
- Sin errores TS en el componente.

### [ ] B00.5 Limpiar tipos stale de `.next` y definir rutina de build limpia
Archivos:
- `tsconfig.json`
- `package.json`

Checklist:
- Definir flujo de build limpio (`clean -> build`) para evitar referencias a rutas antiguas.
- Verificar que `npx tsc --noEmit` no falle por rutas eliminadas.

Criterio de cierre:
- Compilacion TypeScript limpia en entorno local.

### Cierre de fase 0

- `npx tsc --noEmit` en verde.
- `npm run lint` operativo.
- Sin errores de tipado abiertos en modulos admin principales.

## Fase 1 - Fuente unica de verdad en cliente (sin backend aun)

### [ ] B10.1 Crear modulo de dominio para IDs robustos
Archivos:
- `lib/domain/ids.ts` (nuevo)

Checklist:
- Reemplazar estrategia `length + 1` por `crypto.randomUUID()` o secuencia segura.
- Mantener prefijos legibles (`P`, `V`, `PD`, `HP`) solo como vista, no como fuente de unicidad.

Criterio de cierre:
- Ningun modulo genera IDs con `array.length + 1`.

### [ ] B10.2 Crear ledger de inventario
Archivos:
- `lib/domain/inventory-ledger.ts` (nuevo)
- `lib/types.ts`

Checklist:
- Definir tipo `InventoryMovement`.
- Soportar movimientos: `PRODUCCION_ENTRADA`, `VENTA_SALIDA`, `MERMA_SALIDA`, `AJUSTE_MANUAL`.
- Implementar funciones puras de saldo por producto en losas y m2.

Criterio de cierre:
- Se puede reconstruir inventario solo con movimientos.

### [ ] B10.3 Crear reglas de validacion de negocio
Archivos:
- `lib/domain/rules.ts` (nuevo)

Checklist:
- Regla: no vender sin stock.
- Regla: no registrar mermas negativas o cero.
- Regla: no pagar produccion ya pagada.
- Regla: no producir sobre bloque/lote agotado.

Criterio de cierre:
- Las validaciones se ejecutan antes de mutar estado.

### [ ] B10.4 Unificar estado admin en un store compartido
Archivos:
- `lib/store/admin-store.ts` (nuevo)
- `hooks/use-inventario.ts`
- `hooks/use-productos.ts`
- `hooks/use-configuracion.ts`

Checklist:
- Consolidar `productos`, `ventas`, `produccion`, `mermas`, `trabajadores`, `pagos`, `bloques`, `config`.
- Persistir un solo snapshot versionado en `localStorage`.
- Implementar hidratacion y migraciones de version basicas.

Criterio de cierre:
- Todos los modulos consumen el mismo estado base.

### [ ] B10.5 Conectar produccion al ledger e inventario
Archivos:
- `app/admin/produccion/page.tsx`
- `lib/domain/inventory-ledger.ts`

Checklist:
- Al registrar produccion, crear movimientos de entrada a inventario.
- Aplicar tarifa personalizada del trabajador si existe; si no, tarifa global.
- Actualizar metrica del trabajador (`losasProducidas`, acumulados).

Criterio de cierre:
- Produccion impacta inventario y pagos pendientes de forma automatica.

### [ ] B10.6 Conectar ventas a inventario real
Archivos:
- `app/admin/ventas/page.tsx`
- `lib/domain/inventory-ledger.ts`
- `lib/domain/rules.ts`

Checklist:
- Validar stock antes de confirmar venta.
- Descontar inventario al pasar venta a `completada`.
- Revertir inventario si una venta completada pasa a `cancelada`.

Criterio de cierre:
- Nunca queda stock negativo por venta.

### [ ] B10.7 Conectar mermas a inventario real
Archivos:
- `app/admin/mermas/page.tsx`
- `lib/domain/inventory-ledger.ts`

Checklist:
- Registrar merma como salida de inventario.
- Reflejar merma en resumenes financieros.

Criterio de cierre:
- Mermas afectan stock y KPIs.

### [ ] B10.8 Sincronizar pagos, finanzas y contabilidad con el store comun
Archivos:
- `app/admin/pagos/page.tsx`
- `app/admin/finanzas/page.tsx`
- `app/admin/contabilidad/page.tsx`
- `app/admin/trabajadores/page.tsx`

Checklist:
- Pagos marcados como pagados deben reflejarse en finanzas/contabilidad sin recargar.
- El detalle de trabajador debe usar datos actuales del store, no arrays iniciales estaticos.

Criterio de cierre:
- Cualquier pago nuevo cambia inmediatamente todos los paneles afectados.

### [ ] B10.9 Corregir permisos de materia prima para Super Admin
Archivos:
- `app/admin/bloques/page.tsx`
- `lib/admin-auth.ts`

Checklist:
- Ajustar regla `canModify` para incluir `Super Admin`.
- Mantener restriccion temporal para roles que correspondan.

Criterio de cierre:
- Super Admin puede modificar sin bloqueo por fecha.

### Cierre de fase 1

- Flujo completo: `Produccion -> Inventario -> Venta -> Pago -> Finanzas` consistente.
- Sin divergencia entre modulos por estado local aislado.

## Fase 2 - Multi-taller real dentro del frontend

### [ ] B20.1 Agregar `workshopId` al dominio operativo
Archivos:
- `lib/types.ts`
- `lib/data.ts`

Checklist:
- Extender entidades operativas con `workshopId` cuando aplique.
- Crear datos mock separados por taller para pruebas.

Criterio de cierre:
- Datos identificables por taller en todo el dominio.

### [ ] B20.2 Propagar taller activo al store y modulos
Archivos:
- `app/admin/layout.tsx`
- `lib/workshops.ts`
- `lib/store/admin-store.ts`

Checklist:
- Taller activo debe filtrar todas las lecturas/escrituras de negocio.
- Crear/editar/eliminar talleres debe persistir.

Criterio de cierre:
- Cambiar de taller cambia el contexto de datos visibles.

### [ ] B20.3 Aislar paneles por taller
Archivos:
- `app/admin/inventario/page.tsx`
- `app/admin/produccion/page.tsx`
- `app/admin/ventas/page.tsx`
- `app/admin/mermas/page.tsx`
- `app/admin/pagos/page.tsx`
- `app/admin/finanzas/page.tsx`
- `app/admin/contabilidad/page.tsx`
- `app/admin/trabajadores/page.tsx`
- `app/admin/historial/page.tsx`

Checklist:
- Todas las consultas deben usar solo el taller activo.
- Logs y metricas deben indicar taller origen.

Criterio de cierre:
- No hay leakage de datos entre talleres.

## Fase 3 - Backend y seguridad real

### [ ] B30.1 Diseñar esquema de base de datos
Archivos:
- `prisma/schema.prisma` (nuevo)
- `prisma/migrations/*` (nuevo)

Checklist:
- Modelar entidades principales con relaciones y `workshopId`.
- Agregar constraints de integridad y claves unicas.

Criterio de cierre:
- Migraciones aplican en local sin errores.

### [ ] B30.2 Crear capa de repositorios y casos de uso server-side
Archivos:
- `lib/server/repositories/*.ts` (nuevo)
- `lib/server/use-cases/*.ts` (nuevo)

Checklist:
- Mover reglas de negocio criticas al servidor.
- Mantener UI delgada y sin calculos sensibles de negocio.

Criterio de cierre:
- Operaciones criticas ejecutan por API/casos de uso server-side.

### [ ] B30.3 Implementar auth segura con roles
Archivos:
- `lib/admin-auth.ts` (refactor profundo)
- `app/admin/layout.tsx`
- `middleware.ts` (nuevo)
- `app/api/auth/*` o integracion externa (nuevo)

Checklist:
- Eliminar credenciales hardcodeadas del frontend.
- Guardar passwords hasheadas.
- Control de acceso en servidor y middleware.

Criterio de cierre:
- Sin logica de auth sensible en cliente.

### [ ] B30.4 Reemplazar persistencia local por API
Archivos:
- `hooks/use-inventario.ts`
- `hooks/use-productos.ts`
- `hooks/use-configuracion.ts`
- `app/admin/*/page.tsx`

Checklist:
- Consumir endpoints reales con manejo de carga/error.
- Mantener cache local solo como optimizacion.

Criterio de cierre:
- Datos sobreviven a navegador/dispositivo y son multiusuario.

## Fase 4 - Integraciones de negocio

### [ ] B40.1 WhatsApp de ventas profesional
Archivos:
- `components/landing/quick-cart.tsx`
- `app/api/checkout/whatsapp/route.ts` (nuevo)

Checklist:
- Mover construccion de mensaje al servidor.
- Registrar intento de pedido y fuente.

Criterio de cierre:
- Checkout WhatsApp trazable y auditable.

### [ ] B40.2 Notificaciones operativas
Archivos:
- `app/api/notifications/*` (nuevo)
- `lib/server/notifications/*.ts` (nuevo)

Checklist:
- Alertas de stock bajo, merma alta y nomina pendiente.
- Configurables desde `configuracion`.

Criterio de cierre:
- Alertas salen por email y quedan registradas.

### [ ] B40.3 Exportables y reportes contables
Archivos:
- `app/admin/contabilidad/page.tsx`
- `app/api/reports/*` (nuevo)

Checklist:
- Exportar cortes en CSV/PDF.
- Definir periodo contable y cierre mensual.

Criterio de cierre:
- Reportes descargables y consistentes con datos operativos.

## Fase 5 - QA, observabilidad y CI

### [ ] B50.1 Tests unitarios de dominio
Archivos:
- `lib/domain/*.test.ts` (nuevo)

Checklist:
- Probar ledger, reglas de stock, pago y mermas.
- Cubrir casos borde (cancelaciones, reversas, duplicados).

Criterio de cierre:
- Cobertura minima de dominio >= 80%.

### [ ] B50.2 Tests E2E de flujo critico
Archivos:
- `e2e/admin-flow.spec.ts` (nuevo)

Checklist:
- Escenario: producir, vender, registrar merma, pagar, validar finanzas.
- Escenario: cambio de taller y aislamiento de datos.

Criterio de cierre:
- Flujos criticos verdes en CI.

### [ ] B50.3 Pipeline CI
Archivos:
- `.github/workflows/ci.yml` (nuevo)

Checklist:
- Jobs: install, typecheck, lint, test.
- Bloquear merge con checks rojos.

Criterio de cierre:
- CI estable en PRs.

## Backlog de correcciones UX/consistencia (paralelo)

### [ ] BX.1 Unificar textos y encoding
Archivos:
- `app/admin/configuracion/page.tsx`
- `app/admin/inventario/page.tsx`
- `app/admin/ventas/page.tsx`
- `app/admin/produccion/page.tsx`

Checklist:
- Corregir caracteres corruptos (`m2`, acentos rotos, placeholders).
- Estandarizar formato de moneda y unidades.

Criterio de cierre:
- UI sin artefactos de encoding.

### [ ] BX.2 Conectar catalogo admin con landing
Archivos:
- `app/admin/catalogo/page.tsx`
- `components/landing/quick-cart.tsx`
- `lib/catalogo-data.ts`

Checklist:
- Fuente comun para items visibles/destacados.
- Landing refleja cambios del admin en tiempo real o via persistencia.

Criterio de cierre:
- Catalogo publicado = catalogo mostrado.

## Definicion de terminado global

- Datos consistentes entre modulos.
- Seguridad de acceso validada en servidor.
- Multi-taller aislado por `workshopId`.
- Sin errores de compilacion ni lint.
- Flujo operativo critico cubierto por tests.
