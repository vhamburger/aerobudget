# Aerobudget Release Notes

## [1.2.4] - 2026-04-28
### Added
- **Numeric Only Option**: New setting for clubs to restrict invoice number extraction to digits only.
- **Word Boundaries**: Improved parser regex to prevent matching keywords inside other words (e.g., "Abrechnung").

## [1.2.3] - 2026-04-28
### Fixed
- **Invoice Number Extraction**: Added blacklist for "QR-Code" and "IBAN" to prevent multiple invoices being merged under the same ID.
- **Parser Robustness**: Now searches for multiple matches if the first one is invalid.

## [1.2.2] - 2026-04-28
### Added
- **Debug Mode**: Configurable logging level in Settings -> Advanced.
- **Detailed Logging**: Better visibility into Parser (extracted numbers) and Watcher (matching IDs).
- **Release Manifest**: This file to track version history.

### Fixed
- **Duplicate API**: Removed redundant `/api/clubs/{id}` definition in backend.
- **Invoice Collisions**: Improved fallback for missing invoice numbers (nanoseconds + filename) to prevent merging different PDFs.

## [1.2.1] - 2026-04-28 (Internal/Fix)
### Fixed
- **DB Migration**: Added `file_path` column to existing databases automatically.
- **Version String**: Fixed frontend showing v1.1.0 instead of v1.2.3.

## [1.2.0] - 2026-04-28
### Added
- **Flugkosten Forecast**: Tool to estimate costs for future flights based on latest invoice data.
- **PDF Preview**: View original invoices directly from the flight table.
- **CSV Export**: Download filtered logbook data.
- **Date Range Filter**: Specific date picker for the flights table.
- **Custom Mapping**: Added "Keyword Rechnungs-Nr." to club settings for better parsing.

## [1.1.0] - 2026-04-27
### Added
- **Search & Filter**: Global search for flights and clickable aircraft registrations.
- **UX Improvements**: Empty state handling and clickable badges.

## [1.0.0] - 2026-04-26
- Initial release with Dashboard, Flight Table, and Basic PDF Parsing.
