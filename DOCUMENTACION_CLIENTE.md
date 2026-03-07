# Documentacion Funcional para Cliente

Fecha: 26 de febrero de 2026

## 1) Objetivo del proyecto

Este sistema tiene dos frentes:

1. Sitio comercial (publico): mostrar coleccion y captar compras por WhatsApp.
2. Panel administrativo: controlar operacion del taller (produccion, ventas, inventario, pagos, finanzas y seguimiento interno).

La plataforma ya permite operar flujos clave en modo de trabajo interno, con foco en control diario y visibilidad del negocio.

## 2) Perfiles de uso

El sistema contempla perfiles con acceso por area:

1. Super Admin
2. Administrador
3. Contadora
4. Gestor de Ventas
5. Jefe de Turno de Produccion
6. Obrero

Cada perfil ve solo las secciones que necesita.

## 3) Flujo general recomendado (dia a dia)

1. Registrar materia prima (bloques/lotes) y equipos disponibles.
2. Cargar produccion diaria por accion (picar, pulir, escuadrar).
3. Revisar asignaciones automaticas por trabajador.
4. Consultar inventario operativo y partidas (merma/reutilizable).
5. Registrar ventas por cliente.
6. Registrar gastos operativos (costo, tipo, motivo y responsable).
7. Registrar mermas fuera de produccion cuando aplique.
8. Ejecutar pagos pendientes al personal.
9. Revisar finanzas y contabilidad para cierre operativo.
10. Consultar historial para auditoria interna.

## 4) Funcionalidades implementadas

### 4.1 Sitio comercial (Landing)

Que ya hace:

1. Presenta la marca, galeria de materiales y datos de contacto.
2. Incluye carrito rapido para cotizar/armar pedido en m2.
3. Permite cerrar compra por WhatsApp con mensaje armado automaticamente.

Flujo del cliente:

1. Entra al sitio.
2. Revisa coleccion.
3. Agrega piezas destacadas al carrito rapido.
4. Ajusta m2 por producto.
5. Presiona "Comprar por WhatsApp" y se abre conversacion con detalle de pedido.

### 4.2 Acceso administrativo

Que ya hace:

1. Inicio de sesion por usuario.
2. Control de acceso por perfil.
3. Para Super Admin: seleccion de taller antes de entrar al panel.

Flujo:

1. Usuario ingresa con su cuenta.
2. El sistema valida perfil.
3. Se habilitan solo las secciones permitidas.
4. Si es Super Admin, primero selecciona el taller a administrar.

### 4.3 Dashboard principal

Que ya hace:

1. Muestra resumen ejecutivo del estado operativo.
2. Entrega indicadores rapidos de inventario, produccion, ventas, mermas y equipo.
3. Permite navegar rapidamente a cada modulo.

### 4.4 Materia prima (Bloques/Lotes)

Que ya hace:

1. Alta, edicion y eliminacion de bloques/lotes.
2. Registro de tipo, dimension base, proveedor y costos.
3. Cambio de estado (activo/agotado).
4. Vista de detalle de cada bloque/lote.

Flujo:

1. Crear bloque/lote con costos base.
2. Ajustar estado conforme avanza el uso del material.
3. Consultar resumen por dimensiones y proveedores.

### 4.5 Produccion diaria

Que ya hace:

1. Registro detallado por accion: picar, pulir y escuadrar.
2. Captura por equipo, personal asignado, bloque/lote, tipo y dimension.
3. Registro de losas procesadas, merma total y reutilizable.
4. Validaciones de captura para evitar errores de registro.
5. Vista agrupada por fecha con resumen diario.

Flujo:

1. Abrir "Registrar produccion".
2. Seleccionar fecha.
3. Cargar filas por accion y subfilas por dimension.
4. Guardar registro.
5. Revisar resumen lateral del dia.

### 4.6 Asignaciones por trabajador

Que ya hace:

1. Construye asignaciones automaticamente desde Produccion diaria.
2. Reparte trabajo y estimado por integrante de equipo.
3. Muestra top trabajadores, resumen por accion y detalle por bloque/lote.

Flujo:

1. Registrar produccion.
2. Ir a Asignaciones.
3. Ver distribucion automatica por trabajador y accion.

### 4.7 Inventario

Que ya hace:

1. Vista operativa por estado (picado/pulido/escuadrado).
2. Filtros por tipo, estado y dimension.
3. Visuales por bloque/lote y concentrado general.
4. Separacion visual entre stock operativo y partidas (merma/reutilizable).

Nota de uso:

1. Esta vista actualmente esta orientada a consulta y analisis.

### 4.8 Ventas

Que ya hace:

1. Registro de venta con varios productos en una sola operacion.
2. Calculo automatico de subtotal, descuento y total.
3. Captura de datos del cliente.
4. Trazabilidad por bloque y dimension en el detalle de venta.
5. Historial de ventas por fecha con vista de detalle.

Flujo:

1. Crear "Nueva venta".
2. Agregar uno o varios productos.
3. Definir m2 por item.
4. Completar datos del cliente.
5. Confirmar registro.

### 4.9 Mermas

Que ya hace:

1. Integra mermas/reutilizable que vienen desde Produccion.
2. Permite registrar mermas fuera de produccion de forma manual.
3. Clasifica entre "Merma total" y "Reutilizable".
4. Incluye tableros visuales por fuente, motivo, fecha y bloque/lote.

Flujo:

1. Registrar produccion para capturar mermas del proceso.
2. Si hay perdida fuera del proceso, registrar manualmente.
3. Revisar analitica de impacto.

### 4.10 Equipos

Que ya hace:

1. Alta de equipos (cortadora, pulidora, escuadradora).
2. Estado operativo (activo, mantenimiento, inactivo).
3. Control por codigo interno y notas de seguimiento.

### 4.11 Trabajadores

Que ya hace:

1. Alta/edicion/baja logica de personal.
2. Gestion de rol, estado y datos de contacto.
3. Definicion de acceso al sistema para roles que lo requieren.
4. Vista de rendimiento y seguimiento individual.

### 4.12 Pagos

Que ya hace:

1. Calcula pendientes por trabajador.
2. Diferencia esquema de pago por produccion (obrero) y salario fijo (otros roles).
3. Permite agregar bono extra y observaciones.
4. Genera historial de pagos con detalle.

Flujo:

1. Revisar pendientes por trabajador.
2. Abrir "Realizar pago".
3. Confirmar monto y bonos.
4. Registrar y consultar en historial.

### 4.13 Catalogo administrable

Que ya hace:

1. Alta, edicion y eliminacion de items de catalogo.
2. Control de visibilidad y destacado.
3. Filtros por tipo, acabado, dimension y estado comercial.

### 4.14 Finanzas y Contabilidad

Que ya hace:

1. Panel de resultados financieros con formula operativa definida.
2. Visualizacion de ingresos, costos, margenes, reserva y distribucion.
3. Vista contable de supervision para revisar ingresos, descuentos y pagos.

### 4.15 Gastos operativos

Que ya hace:

1. Permite registrar gastos con costo, tipo, flujo del negocio, motivo y persona encargada.
2. Guarda historial de gastos con filtros por tipo, flujo y texto de busqueda.
3. Muestra indicadores de gasto total, gasto del mes, promedio e impacto sobre ingresos operativos.
4. Conecta los gastos registrados con el panel de Finanzas para reflejar su impacto en la ganancia neta.

### 4.16 Historial del sistema

Que ya hace:

1. Registro de eventos internos.
2. Busqueda por usuario, modulo y tipo de evento.
3. Apoyo para auditoria y seguimiento.

### 4.17 Panel del obrero

Que ya hace:

1. Vista personal de produccion pendiente de pago.
2. Resumen de bonos pendientes y total cobrado.
3. Historial de pagos del propio trabajador.

## 5) Alcance actual de esta version (importante para operacion)

1. Varias secciones ya operan en flujo real de captura diaria.
2. Algunas vistas siguen en modo de analisis/demo y se usan para validacion operativa.
3. Ciertos movimientos no impactan automaticamente todos los modulos al mismo tiempo.
4. Parte de la informacion se conserva por sesion/dispositivo, no como base central multiusuario completa.

## 6) Ajustes recomendados antes de salida comercial final

1. Unificar toda la informacion en una sola base central para que todos vean siempre los mismos datos.
2. Conectar de forma completa Produccion, Inventario, Ventas, Mermas y Pagos para que cada movimiento actualice el resto automaticamente.
3. Sincronizar el Catalogo administrable con el carrito del sitio publico.
4. Fortalecer seguridad de acceso con credenciales definitivas y control robusto por perfil.
5. Activar aislamiento real por taller (multi-sede), para que cada sede trabaje solo con sus propios datos.
6. Definir flujo de cierres diarios/semanales (produccion, ventas, pagos y contabilidad) con responsables claros.
7. Incorporar respaldos, exportacion de reportes y tablero de alertas operativas.

## 7) Conclusion

El proyecto ya cubre los procesos clave de operacion y seguimiento del taller, con una base funcional solida para uso interno y validacion con equipo real.  
Con los ajustes recomendados arriba, puede pasar a una operacion comercial multiusuario mas robusta y escalable.
