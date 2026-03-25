# Backend (Express) - Arquitectura limpia

## Ejecucion

1. `cd backend`
2. `pnpm install`
3. `pnpm run dev`

- Health: `GET http://localhost:4000/health`
- API base: `http://localhost:4000/api`

## Estructura (Clean Architecture)

```
src/
|-- domain/                    # Nucleo del negocio (sin dependencias externas)
|   |-- entities/              # Entidades y value objects
|   `-- ports/                 # Interfaces (repositorios, adaptadores)
|
|-- application/               # Casos de uso y DTOs
|   |-- dtos/                  # Request/Response DTOs por recurso
|   `-- use-cases/             # Casos de uso por agregado (bloques, productos, etc.)
|
|-- infrastructure/            # Implementaciones concretas
|   |-- persistence/
|   |   `-- in-memory/         # Repositorios en memoria (implementan ports)
|   |-- http/                  # Capa HTTP (Express)
|   |   |-- controllers/       # Controladores que invocan use cases
|   |   |-- middlewares/       # Validacion (Zod), etc.
|   |   |-- schemas/           # Esquemas Zod para request
|   |   `-- routes/            # Rutas API
|   `-- container.ts           # Composition root (inyeccion de dependencias)
|
|-- store/                     # Estado en memoria + seed (repos in-memory)
|-- app.ts
`-- server.ts
```

- **Domain**: entidades y puertos (interfaces). No dependen de Express ni de la base de datos.
- **Application**: DTOs y use cases. Dependen solo de los puertos del domain.
- **Infrastructure**: implementa los puertos (repos in-memory), controladores HTTP, validacion con Zod y rutas. El **container** instancia repos y use cases y los conecta.

### Base de datos PostgreSQL (opcional)

Si quieres usar la base **marmol** en PostgreSQL:

1. Crea la base `marmol` en pgAdmin.
2. En `backend/` crea un `.env` con:
   ```env
   DATABASE_URL=postgresql://usuario:contrasena@localhost:5432/marmol
   ```
3. Opcional (recomendado en produccion): define las credenciales del super admin en `.env`:
   ```env
   SUPER_ADMIN_EMAIL=superadmin@marmol.local
   SUPER_ADMIN_PASSWORD=cambia-esta-clave
   ```
4. Aplica schema y migraciones:
   ```bash
   pnpm run db:setup
   ```
5. Para una base ya existente (sin recrear schema), ejecuta solo migraciones:
   ```bash
   pnpm run db:migrate
   ```
6. Arranca el backend: `pnpm run dev`. Si `DATABASE_URL` esta definida, se usa Postgres; si no, memoria.

## API REST

| Recurso | GET (list/one) | POST | PATCH | DELETE |
|--------|-----------------|------|-------|--------|
| `/api/configuracion` | yes / - | - | PUT yes | - |
| `/api/bloques` | yes | yes | yes | yes |
| `/api/productos` | yes | yes | yes | yes |
| `/api/trabajadores` | yes | yes | yes | yes |
| `/api/equipos` | yes | yes | yes | yes |
| `/api/produccion` | yes | yes | yes | yes |
| `/api/produccion-trabajadores` | yes | yes | yes | yes |
| `/api/mermas` | yes | yes | yes | yes |
| `/api/ventas` | yes | yes | yes | yes |
| `/api/historial-pagos` | yes | yes | yes | yes |
| `/api/logs` | yes | yes | - | - |
| `/api/workshops` | yes | yes | yes | yes |
| `/api/auth/login` | - | yes | - | - |

Los bodies de POST/PATCH se validan con **Zod**; si fallan se responde `400` con `{ error: "Validation failed", details: [...] }`.

## Scripts

- `pnpm run dev` - desarrollo con tsx watch
- `pnpm run build` - compilar a `dist/`
- `pnpm run start` - ejecutar `dist/server.js`
- `pnpm run check` - `tsc --noEmit`
- `pnpm run db:setup` - aplicar schema SQL y migraciones (requiere `DATABASE_URL` en `.env`)
- `pnpm run db:migrate` - aplicar solo migraciones pendientes (ideal para produccion)
