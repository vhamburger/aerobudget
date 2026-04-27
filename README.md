# Aerobudget

A self-hosted, containerized web application for private pilots to track flight costs, match logbooks with invoices, and analyze flying expenses.

[🇩🇪 Deutsche Version](#aerobudget---deutsch)

## Features
- **Generic CSV Import**: Import flight logbooks (e.g., from "B4 takeoff") using customizable templates.
- **Automated Invoice Matching**: Drop PDF invoices into a folder. The app uses OCR to extract aircraft registrations and matches costs to your logged flights.
- **Configurable Billing**: Supports per-minute, block-time, or custom billing structures per flying club.
- **Advanced Dashboards**: Visualize your expenses by aircraft, trip, training (e.g., PPL, IFR), and view your flights on an interactive world map.
- **Cost Forecasting**: Estimate future trips based on historical costs per aircraft and destination.
- **Synology / Portainer Ready**: Designed to run as a single Docker container with persistent volumes for data and invoices.

## Quick Start (Docker)
1. Clone this repository.
2. Edit the volume paths in `docker-compose.yml` if necessary.
3. Run: `docker-compose up -d`

---

# Aerobudget - Deutsch

Eine selbst gehostete, containerisierte Webanwendung für Privatpiloten, um Flugkosten zu tracken, Logbücher mit Rechnungen abzugleichen und Ausgaben zu analysieren.

## Funktionen
- **Generischer CSV-Import**: Importiere Fluglogbücher (z. B. von "B4 takeoff") über anpassbare Templates.
- **Automatischer Rechnungsabgleich**: Lege PDF-Rechnungen einfach in einen Ordner. Die App nutzt OCR, um Flugzeugkennzeichen zu extrahieren, und ordnet die Kosten deinen geloggten Flügen zu.
- **Konfigurierbare Abrechnung**: Unterstützt minunten-genaue Abrechnung (Flugzeit), Blockzeit oder benutzerdefinierte Strukturen pro Flugverein.
- **Fortschrittliche Dashboards**: Visualisiere deine Ausgaben nach Flugzeug, Trip, Ausbildungsart (z.B. PPL, IFR) und betrachte deine Flüge auf einer interaktiven Weltkarte.
- **Kostenprognose**: Schätze zukünftige Trips basierend auf historischen Kosten pro Flugzeug und Ziel.
- **Synology / Portainer Ready**: Entwickelt als einzelner Docker-Container mit persistenten Volumes für Daten und Rechnungen.

## Schnellstart (Docker)
1. Repository klonen.
2. Volumepfade in der `docker-compose.yml` bei Bedarf anpassen.
3. Ausführen: `docker-compose up -d`
