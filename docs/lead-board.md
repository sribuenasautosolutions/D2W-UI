# Responsive lead board

Uses the existing owner/store lead routes, LeadCreate and edit form, shared authenticated API client, and existing procurement / Proforma sales pages. Requires the paired backend branch `feature/d2w-lead-kanban-20261001` and its V3 manual migration.

Seven columns distinguish procurement follow-up from proforma follow-up. Closed leads are optional. Each column fetches 20 cards with Load more and server-side filtering. The side panel fetches complete lead details, appends notes, schedules reminders, updates CRM stages, creates a selected-item Proforma with explicit GST treatment, and displays the saved quotation. Procurement and sales fulfillment open the existing workflow in a separate tab so the board remains available; refresh after changes in that tab.

Phone/WhatsApp buttons open the relevant client; they do not send messages automatically. Won is recorded by completed sales, not by a CRM-only status override. Lost asks for a reason; Closed archives a terminal outcome.

Styles provide horizontal column scrolling, touch targets, visible keyboard focus, and a full-width mobile sheet below 768px. The panel traps focus, supports Escape, and restores card focus. Follow-up times use the viewer's local timezone and overdue indications update every minute. Date filters apply to lead creation dates.

Checks: `node --test tests/leadBoardModel.test.js`. Review desktop, tablet and mobile layouts in the integrated app before release, including the existing create/edit forms. Test quotation creation, stale edits and completed sales against the paired backend.
