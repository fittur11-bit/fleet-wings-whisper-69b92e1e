# Visual Refinement Plan: Core Flight (Stage 2)

Refine the application's visual identity to move from a generic SaaS appearance to a professional, technical aviation and engineering management system.

## Design Principles
- **Identity:** Aviation + Engineering + Technology + Corporate.
- **Palette:** 
    - Bg: #F4F5F6 | Cards: #FFFFFF | Sidebar: #17212B
    - Primary: #245A7A | Dark Blue: #193B50 | Hover: #2F7196
    - Text: #1D252C (Main), #66727D (Secondary)
    - Borders: #D9DEE2
    - Operational Status: #37805A (Available), #C58A21 (Low), #B94A48 (Unavailable)
- **Geometry:** Standard 6px radius, 1px solid borders, no gradients, no glow, no glassmorphism.
- **Typography:** Strict Inter hierarchy.

## Implementation Steps

### 1. Global System Refinement
- **Styles (`src/styles.css`):**
    - Finalize color tokens with exact hex codes.
    - Standardize `--radius` and `--shadow-sm`.
    - Define a `technical-table` utility class for high-density, professional tables.
    - Remove all `oklch` references and gradients.
- **Components (`src/components/ui`):**
    - **Button:** Solid colors only; Primary #245A7A, Hover #2F7196, Secondary White/Border.
    - **Card:** Solid #FFFFFF background, #D9DEE2 border, 6px radius.
    - **Badge:** Solid status colors (Operational meanings only).

### 2. Dashboard Technical Overhaul (`src/routes/dashboard.tsx`)
- **Hierarchy:** Redesign the Bento Grid to prioritize critical operational data.
- **Stats:** Implement high-impact typography for "Frota Ativa" and "Alertas".
- **Visuals:** Use institutional blue for subliminal indicators (discreet dividers, small accents).
- **Charts:** Standardize colors to institutional blue and operational status tones.

### 3. Sidebar & Navigation (`src/components/AppSidebar.tsx`)
- **Navigation:** Implement a "discreet lateral indicator" for active items.
- **Branding:** Refine the FlightCore logo area to be more corporate/technical.
- **Contrast:** Ensure moderate contrast without glow or gradients.

### 4. High-Density Operations (`src/routes/parts.tsx`, `src/routes/aircraft.tsx`)
- **Tables:** Replace card-like lists with structured tables where appropriate.
- **Data Clarity:** Highlight P/N (Part Number) and Serial Numbers using monospace/technical weights.
- **Consistency:** Apply the refined card and button styles across all forms and modals.

### 5. Final Polish & Removal of "Gen-AI" Aesthetics
- **Audit:** Scan all files for `glass-card`, `backdrop-blur`, `shadow-lg`, and generic gradients.
- **Cleanup:** Replace with `technical-card` and standard borders.

## Technical Details
- **Inter Font:** Ensure weight hierarchy (400 for text, 600/700 for headings).
- **Density:** Adjust padding/margins to favor information density without overcrowding.
- **Responsive:** Maintain horizontal efficiency on desktop while ensuring clean stacking on mobile.
