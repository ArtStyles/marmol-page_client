# Admin Component Architecture

## Objective
- Keep top-level components focused on composition.
- Move business/state logic to hooks.
- Extract repeated UI blocks into small presentational components.
- Keep imports stable using facade files.

## Current Pattern
- `components/admin/workshop-selector.tsx`: facade export only.
- `components/admin/workshop-selector-feature/`: feature folder with:
  - `containers/admin-workshop-selector.tsx`: composition/root container.
  - `components/`: presentational UI blocks.
  - `hooks/`: state + behavior orchestration.
  - `model/`: contracts and static configuration.
  - `lib/`: pure helpers.
  - `index.ts`: public API for imports.
- `components/admin/admin-shell.tsx`: facade export only.
- `components/admin/admin-shell-feature/`: same structure (`containers/components/hooks/model/lib`) and `index.ts` as feature API.
- `components/admin/dashboard-tables.tsx`: facade export only.
- `components/admin/dashboard-tables-feature/`: same structure with lightweight container + presentational tables + selectors.
- `app/admin/ventas/page.tsx`: route facade export only.
- `app/admin/ventas/feature/`:
  - `containers/ventas-page.tsx`: UI composition.
  - `hooks/use-ventas-page-state.ts`: state + orchestration.
  - `model/`: route-specific contracts.
  - `lib/`: pure helper functions and formatters.
  - `index.ts`: route feature API.
- `app/admin/produccion/page.tsx`: route facade export only.
- `app/admin/produccion/feature/`:
  - `containers/produccion-page.tsx`: route composition.
  - `components/create-dialog/produccion-create-dialog.tsx`: create/update production form dialog.
  - `components/create-dialog/produccion-action-section.tsx`: per-action editor block used inside the dialog.
  - `components/produccion-right-panel.tsx`: isolated presentational side panel.
  - `components/produccion-registros-list.tsx`: historical records list/table view.
  - `hooks/use-produccion-page-state.ts`: state + validations + submit orchestration.
  - `model/`: route contracts and form types.
  - `lib/`: pure helpers/constants and numeric input handlers.
  - `index.ts`: route feature API.
- `app/admin/asignaciones/page.tsx`: route facade export only.
- `app/admin/asignaciones/feature/`:
  - `containers/asignaciones-page.tsx`: route composition.
  - `hooks/use-asignaciones-page-state.ts`: state + derived aggregations.
  - `model/`: route contracts.
  - `lib/`: pure mappers/formatters/constants.
  - `index.ts`: route feature API.

## Next Refactor Candidates
1. Keep splitting large route containers in `app/admin/*/feature/containers/*` into:
   - `hooks/`
   - `sections/`
   - `dialogs/`
   - `helpers/`
