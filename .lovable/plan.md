I will improve the Service module to make it more accessible and interactive, allowing users to view details and photos directly from the list without needing to generate a report first.

### Changes:
1.  **Add Service Details View**: Create a "View Details" dialog or expand the list items to show the full description, checklist status, and associated photos.
2.  **Photo Gallery**: Implement a simple photo preview/gallery directly in the service card or details view.
3.  **UI Enhancements**:
    *   Update the service cards in `src/routes/services.tsx` to include quick-view buttons.
    *   Add a "Details" modal that shows the information currently only available in the edit mode or report.
    *   Ensure photos are easily clickable to view in full size.

### Technical Details:
*   Modify `src/routes/services.tsx` to include a `viewing` state similar to `editing`.
*   Create a `ServiceDetailsDialog` component or inline it to display all data (including photos and checklist) in a read-only, high-contrast format.
*   Add a thumbnail preview section to the cards for quick visual confirmation.
