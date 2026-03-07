# Backend (Express) – Arquitectura limpia

## Ejecución

1. `cd backend`
2. `pnpm install`
3. `pnpm run dev`

- Health: `GET http://localhost:4000/health`
- API base: `http://localhost:4000/api`

## Estructura (Clean Architecture)

```
src/
├── domain/                    # Núcleo del negocio (sin dependencias externas)
│   ├── entities/              # Entidades y value objects
│   └── ports/                 # Interfaces (repositorios, adaptadores)
│
├── application/               # Casos de uso y DTOs
│   ├── dtos/                  # Request/Response DTOs por recurso
│   └── use-cases/             # Casos de uso por agregado (bloques, productos, etc.)
│
├── infrastructure/            # Implementaciones concretas
│   ├── persistence/
│   │   └── in-memory/         # Repositorios en memoria (implementan ports)
│   ├── http/                  # Capa HTTP (Express)
│   │   ├── controllers/       # Controladores que invocan use cases
│   │   ├── middlewares/      # Validación (Zod), etc.
│   │   ├── schemas/           # Esquemas Zod para request
│   │   └── routes/            # Rutas API
│   └── container.ts           # Composition root (inyección de dependencias)
│
├── store/                     # Estado en memoria + seed (usado por repos in-memory)
├── app.ts
└── server.ts
```

- **Domain**: entidades y puertos (interfaces). No dependen de Express ni de la base de datos.
- **Application**: DTOs y use cases. Dependen solo de los puertos del domain.
- **Infrastructure**: implementa los puertos (repos in-memory), controladores HTTP, validación con Zod y rutas. El **container** instancia repos y use cases y los conecta.

### Base de datos PostgreSQL (opcional)

Si quieres usar la base **marmol** en PostgreSQL:

1. Crea la base `marmol` en pgAdmin (ya la tienes).
2. En `backend/` crea un `.env` con:
   ```env
   DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/marmol
   ```
3. Aplica el schema (tablas + datos iniciales):
   ```bash
   pnpm run db:setup
   ```
4. Arranca el backend: `pnpm run dev`. Si `DATABASE_URL` está definida, se usará Postgres; si no, memoria.

## API REST

| Recurso | GET (list/one) | POST | PATCH | DELETE |
|--------|-----------------|------|-------|--------|
| `/api/configuracion` | ✓ / - | - | PUT ✓ | - |
| `/api/bloques` | ✓ | ✓ | ✓ | ✓ |
| `/api/productos` | ✓ | ✓ | ✓ | ✓ |
| `/api/trabajadores` | ✓ | ✓ | ✓ | ✓ |
| `/api/equipos` | ✓ | ✓ | ✓ | ✓ |
| `/api/produccion` | ✓ | ✓ | ✓ | ✓ |
| `/api/produccion-trabajadores` | ✓ | ✓ | ✓ | ✓ |
| `/api/mermas` | ✓ | ✓ | ✓ | ✓ |
| `/api/ventas` | ✓ | ✓ | ✓ | ✓ |
| `/api/historial-pagos` | ✓ | ✓ | ✓ | ✓ |
| `/api/logs` | ✓ | ✓ | - | - |
| `/api/workshops` | ✓ | ✓ | ✓ | ✓ |
| `/api/auth/login` | - | ✓ | - | - |

Los bodies de POST/PATCH se validan con **Zod**; si fallan se responde `400` con `{ error: "Validation failed", details: [...] }`.

## Scripts

- `pnpm run dev` – desarrollo con tsx watch
- `pnpm run build` – compilar a `dist/`
- `pnpm run start` – ejecutar `dist/server.js`
- `pnpm run check` – `tsc --noEmit`
- `pnpm run db:setup` – aplicar schema SQL en la base `marmol` (requiere `DATABASE_URL` en `.env`)
