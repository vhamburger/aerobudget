# Aerobudget Release Notes

## [1.5.5] - 2026-04-30
### Fixed
- **Critical UI Fix**: Fixed a crash caused by missing icon imports (`Map`, `Info`).
- **Version Bump**: Official release of v1.5.5.

## [1.5.4] - 2026-04-30
### Fixed
- **UI Crash Fix**: Resolved a critical issue where the dashboard failed to load due to unsafe data access in the Airfield 

## [1.5.3] - 2026-04-30
### Fixed
- **Forecast selection**: Fixed a bug where aircraft dropdown was empty due to an overly strict database query.
- **Airfield Data Accuracy**: Improved aggregate calculations for airfield fees using actual flight data.
- **Airfield UI Refactor**: Completely redesigned the Airfield Insights section. It now shows a detailed list ordered by total costs, including average and latest fees.

## [1.5.2] - 2026-04-30
### Fixed
- **Airfield Insights**: Fixed a bug where airfield fees were not saved during the automated reconcile process.
- **Forecast Correction**: Fixed the SQL query for aircraft rates to correctly fetch the latest data, ensuring accurate cost estimates.
- **Internationalization**: Switched currency to £ (GBP) and adjusted number formatting for English (UK) locale.

## [1.5.1] - 2026-04-30
### Fixed
- **FlightTable Crash**: Fixed a runtime error caused by uninitialized edit states in the flight list.
- **Missing Translations**: Restored and localized missing strings for Import, Forecast, and Settings views.
- **Dashboard Robustness**: Added safety checks for Airfield Insights to prevent rendering issues when data is sparse.
- **UI Consistency**: Ensured version string and labels are consistent across all views.

## [1.5.0] - 2026-04-30
### Added
- **Manual Cost Overrides**: Users can now manually edit flight, fuel, and landing fees. Manually adjusted entries are protected with a lock (🔒) and excluded from automated overrides.
- **Fuel Receipt Parsing (Dry Rental)**: New automated parser for fuel receipts (e.g., PETROL/LJPZ). Added a "Dry Rental" toggle in Club settings to support multi-invoice cost aggregation.
- **Airfield Insights**: New dashboard section featuring landing fee trends over time and a breakdown of most/least expensive airports visited.
- **Historical Tracking**: Automated database of historical airfield fees to track pricing evolution across years.
- **Enhanced UI Localization**: Fully localized Login and Password Change dialogs for both German and English.

### Fixed
- **Type Safety**: Fixed backend type mismatches during flight data retrieval.


## [1.4.0] - 2026-04-29
### Added
- **Internationalization (i18n)**: Support for German and English (UI and data).
- **Locale-aware Parsing**: Automatic detection of decimal/date formats (DE/EN).
- **Language Persistence**: User-specific language settings stored in database.
- **Mock Data**: Sample CSVs and PDFs for both locales included.

## [1.3.0] - 2026-04-28
### Added
- **User Authentication**: Secure login system with JWT-based API protection (bcrypt + JWT).
- **Forced Password Change**: Mandatory password update flow for initial setup.
- **Enhanced UI**: Added user profile and session management.

## [1.2.5] - 2026-04-28
### Added
- **File Hashing**: Invoices are now uniquely identified by their file content hash (SHA256). This prevents collisions even if the parser extracts duplicate or wrong invoice numbers (like zip codes).
- **Physical Uniqueness**: Each PDF file now creates its own record, regardless of extracted text quality.

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
- **Version String**: Fixed frontend showing v1.2. instead of v1.2.3.

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
