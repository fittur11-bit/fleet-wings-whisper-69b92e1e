# Final Visual Refinement Plan: Core Flight (Stage 3)

Refine the visual hierarchy and identity of Core Flight, focusing on clear separation between sidebar, background, and cards, especially in Dark Mode, while maintaining the technical aviation engineering aesthetic.

## 1. Global Color Token Refinement (`src/styles.css`)

Update the CSS variables to implement the requested hierarchy:

### Dark Mode
- **Background (`--bg-primary`)**: Change from `#0F172A` to `#0F171E` (deeper, neutral tone).
- **Sidebar (`--sidebar-bg`)**: Re-establish `#17212B` as the navigation-only color.
- **Cards (`--card`)**: Update to `#16222C`.
- **Secondary Surfaces (`--accent`)**: Update to `#1B2A35` for elevated or secondary areas.
- **Borders (`--border`)**: Update to `#2A3945`.
- **Typography**:
  - Main Text (`--text-main`): `#F1F4F6`
  - Secondary Text (`--text-sec`): `#98A6B2`

### Light Mode (Maintenance)
- Keep existing tokens: Fundo `#F4F5F6`, Cards `#FFFFFF`, Bordas `#D9DEE2`, Texto `#1D252C`.
- **Primary Azul**: Ensure `#245A7A` is strictly used for interaction and identity highlights.

## 2. Component Hierarchy & Polish

### Dashboard Refinement
- Adjust layout to favor structured density over decorative cards.
- Ensure KPI cards are compact with a clean left-border indicator for primary identity.
- Refine `technical-card` to rely purely on borders and contrast, removing any lingering shadows or glows.

### Sidebar Refinement
- Verify the active item indicator uses the institutional blue `#245A7A`.
- Maintain the `#17212B` background for distinct navigation separation.

### Operational Indicators
- Strictly map **Technical Amber** (`#C58A21`) to operational statuses (maintenance, low stock, alerts).
- Ensure **Institutional Blue** (`#245A7A`) is used for primary actions, navigation, and neutral branding.

## Technical Details

- **Hierarchy**: SIDEBAR (`#17212B`) ≠ FUNDO (`#0F171E`) ≠ CARD (`#16222C`).
- **Geometry**: Preserve `border-radius: 6px` globally.
- **Visual Style**: Solid colors, high-density data, precise borders. No gradients, glassmorphism, or decorative glows.
- **Typography**: Tabular numbers for technical data, font Inter for all UI elements.
