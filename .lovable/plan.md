### Goal
Transform the current dashboard into a high-end, professional SaaS experience with a premium "Aviation Management" aesthetic (Navy + Gold), improved visual hierarchy, and more intuitive layout.

### Implementation Plan

#### 1. Visual Refinements (Global)
- Update `src/styles.css` to add subtle animated backgrounds (radial gradients) to prevent the "static" feel.
- Refine the `glass-card` classes to include more sophisticated border-image effects or multi-layered shadows.

#### 2. Layout & Navigation (`AppShell.tsx` & `AppSidebar.tsx`)
- **Sidebar**:
  - Update layout to group items into logical categories (Operacional, Administrativo, Configurações).
  - Enhance active state with a more modern "glow" effect instead of a simple border-left.
- **Header**:
  - Add a "Quick Action" button (e.g., "+" menu) directly in the header for fast task creation.
  - Implement a cleaner breadcrumb system.

#### 3. Dashboard Content (`dashboard.tsx`)
- **Top Stats (KPIs)**:
  - Redesign stats cards to be more compact yet information-dense.
  - Add "Sparklines" (mini charts) if possible, or at least percentage change indicators.
- **Data Visualizations**:
  - Update `recharts` styling to use the Gold/Navy theme colors accurately.
  - Switch Bar charts to a more modern style (rounded corners, subtle gradients).
- **Critical Alerts**:
  - Create a dedicated "Command Center" feel for CVA and maintenance alerts.
  - Use more distinctive status indicators (priority-based colors).
- **Recent Activity**:
  - Convert lists into a "Timeline" style view for better readability.

#### 4. UI Components Refactor
- Update `Card` component to use the `.glass-card` class by default for a consistent professional look.
- Ensure all badges and buttons follow the refined color palette.

### Technical Details
- **CSS**: Using Tailwind CSS v4 features (as seen in `styles.css`).
- **Charts**: Recharts with custom `Tooltip` and `Cell` components to match the Navy/Gold theme.
- **Icons**: Lucide-React for clean, consistent iconography.
- **Animations**: Using `tw-animate-css` for entry animations on dashboard widgets.
