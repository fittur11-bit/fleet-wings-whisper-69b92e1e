# Visual Refinement Plan - Stage 3

Implement the professional aviation engineering refinement requested in VOIDPRO-7.md.

## Proposed Changes

### 1. Global Styles and Theming (`src/styles.css`)
- **Dark Mode Palette Upgrade**:
    - `background`: `#0F171E`
    - `sidebar`: `#17212B`
    - `card`: `#16222C`
    - `popover`/`accent`: `#1B2A35`
    - `border`: `#2A3945`
- **Typography & Text Contrast (Dark Mode)**:
    - Main text: `#F1F4F6`
    - Secondary important: `#A5B2BD`
    - Auxiliary/Muted: `#82919D`
- **Operational Colors**:
    - Success (Green): `#37805A`
    - Warning (Amber): `#C58A21`
    - Danger (Red): `#B94A48`

### 2. Dashboard Refinement (`src/routes/dashboard.tsx`)
- **KPI Hierarchy**: Adjust sizes and weights to make numbers the primary visual focus.
    - Labels (ATIVAS, AOG, etc.): Smaller, discrete, high-contrast secondary color.
    - Values: Larger size, bold weight, tabular numbers.
- **Tone Standardization**: Use the new operational colors for status indicators and chips.

### 3. Sidebar Polish (`src/components/AppSidebar.tsx`)
- **Visual Weight**: Reduce font-weight for nav items slightly while maintaining legibility.
- **Active State**: Ensure the blue lateral indicator and active text contrast meet technical specs.

### 4. Component Refinement
- **Buttons (`src/components/ui/button.tsx`)**:
    - Institutional Blue: `#245A7A`
    - Hover: `#2F7196`
    - Ensure solid corporate appearance (no gradients/glows).
- **Badges (`src/components/ui/badge.tsx`)**: Ensure 6px radius and technical styling.

## Technical Details
- Using CSS variables in `src/styles.css` to ensure system-wide consistency.
- Avoiding absolute black, gradients, glows, and glassmorphism as per constraints.
- Maintaining Inter font and technical density.
