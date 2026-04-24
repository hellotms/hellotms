# Changelog

All notable changes to this project will be documented in this file.

## [0.1.9] - 2026-04-24

### Added
- **Dashboard UI Improvements**:
    - Added 'Project Date' (Event Start) and 'Completed Date' columns to the Project Information table.
    - Implemented 5-category transaction filtering: All, Standard Expense, Others Expense, Collection, Payment.
    - Added vertical scrolling to 'Recent Activity' and 'Transactions Log' with fixed card heights (500px).
    - Improved 'Transactions Log' layout with better spacing and multiline support for Title and Note fields.
- **Data Integrity**:
    - Fixed an issue where project dates were not displaying in the Dashboard summary table.

### Upgraded
- System dependencies updated via pnpm.
- Application version bumped from 0.1.8 to 0.1.9 in `package.json`, `Cargo.toml`, and `tauri.conf.json`.

---

## [0.1.8] - 2026-04-14
- Initial production ready release with basic dashboard and financial tracking.
