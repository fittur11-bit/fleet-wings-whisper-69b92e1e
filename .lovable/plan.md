# Plan: Add Monthly Calendar View to Notice Board (Demandas)

Add a professional monthly calendar view to the `demands` module to visualize aircraft schedules (inspections, maintenance, flights).

## User Review Required

> [!IMPORTANT]
> - Should the calendar view be the default, or should we keep the card list as default?
> - Would you like to filter the calendar by a specific aircraft, or show all of them together?
> - When clicking on a day or event in the calendar, should it open the creation/edit dialog directly?

## Proposed Changes

### Logic and Types
- Extend `Demand` interface in `src/lib/demands.ts` if needed (already has `scheduled_start` and `scheduled_end`).
- Create utility functions to group demands by day for the calendar view.

### Components
- Create a new `DemandCalendar` component in `src/routes/demands.tsx` (or a separate file if it gets too large).
- Implement a monthly grid using `date-fns` for date manipulation.
- Each day cell will display:
    - Day number.
    - Small badges/dots for demands scheduled on that day.
    - Hover or click interactions to see details.
- Add a view toggle (List vs. Calendar) in the `PageHeader` of `DemandsPage`.

### User Interface
- Use the project's Charcoal & Ember theme for the calendar grid.
- Differentiate event types (Maintenance, Flight, etc.) using colored indicators or icons.
- Add "Next/Previous Month" navigation controls.
- Ensure the calendar is responsive and looks professional on all screen sizes.

## Technical Details
- **Libraries**: `date-fns` for date logic (already in project).
- **State Management**: React `useState` for the current view month and selected filters.
- **Integration**: Reuse the existing `useDemands` hook and `submit` logic for consistency.
