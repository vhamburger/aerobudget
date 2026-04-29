# Aerobudget ✈️💰

[![Version](https://img.shields.io/badge/version-1.4.0-blue.svg)](https://github.com/vhamburger/aerobudget)
[![Docker](https://img.shields.io/badge/docker-linux/amd64-orange.svg)](https://hub.docker.com/r/vhamburger/aerobudget)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Aerobudget** is a self-hosted, privacy-first web application designed for private pilots to manage their flight expenses. It bridges the gap between your digital logbook and your pile of PDF invoices, providing a clear overview of what you actually pay for your passion.

---

## 🚀 Core Concepts

Aerobudget works by correlating two main data sources:
1. **Logbook Data (CSV)**: Your records of where and when you flew.
2. **Invoice Data (PDF)**: The actual bills from your flying clubs or charter companies.

The app automatically matches these based on **Aircraft Registration**, **Date**, and **Time**, giving you a detailed breakdown of flight fees, landing fees, and approach fees for every single entry.

---

## 🛠 Installation

### Using Docker Compose (Recommended)

Aerobudget is designed to run as a single container. Here is a sample `docker-compose.yml`:

```yaml
version: '3.8'
services:
  aerobudget:
    image: vhamburger/aerobudget:latest
    container_name: aerobudget
    ports:
      - "8011:8080"
    volumes:
      - ./data:/app/data                # Database and config
      - ./invoices:/app/data/invoices   # Drop your PDF invoices here
    environment:
      - ADMIN_USER=admin
      - ADMIN_PASSWORD=admin            # Change this on first login!
      - DB_PATH=/app/data/aerobudget.db
      - INVOICE_WATCH_DIR=/app/data/invoices
    restart: unless-stopped
```

### Portainer / Synology Setup
1. Create a new Stack or Container.
2. Map port `8080` (container) to your desired host port (e.g., `8011`).
3. Map the two volumes mentioned above to persistent paths on your host.
4. Set the environment variables.

---

## ✨ Features

### 📂 CSV Import & Profiles
- **Flexible Mapping**: Use customizable templates to import CSV exports from common logbook apps (e.g., "B4 takeoff").
- **Column Matching**: Map your CSV columns (Date, Aircraft, Departure, Arrival, etc.) once and reuse the profile.
- **Bulk Import**: Process hundreds of flights in seconds.

### 🏢 Flying Clubs & Invoice Profiles
- **Heuristic Parsing**: Define "Clubs" with specific search terms. Aerobudget scans PDF invoices for these terms to identify the issuer.
- **Cost Breakdown**: Configure keywords for each club to distinguish between:
    - **Flight Fees** (The dry/wet rate of the aircraft)
    - **Landing Fees**
    - **Approach Fees** (ACG/DFS fees)
- **Automatic Matching**: The "Reconcile" button automatically pairs invoices with logbook entries based on the aircraft and date.

### 📊 Training Management
- **Progress Tracking**: Define training periods (e.g., "PPL Training", "IFR Rating").
- **Auto-Detection**: The app identifies flights within these date ranges and marks them as training flights in your statistics.
- **Cost Analysis**: See exactly how much your license or rating has cost you so far.

### 📈 Dashboard & Logbook
- **Interactive Stats**: Total costs, cost per aircraft, monthly spending, and more.
- **Visual Maps**: View your flight paths on an integrated map.
- **Detailed Table**: A searchable, filterable logbook showing the status of every flight (matched vs. unmatched).

---

## 🔍 Troubleshooting & Logs

### Debug Logging
If the PDF parser is not extracting data correctly:
1. Go to **Settings** -> **Advanced**.
2. Enable **Debug Mode**.
3. Re-run the import or drop a file.

### Viewing Logs
- **Docker**: Run `docker logs -f aerobudget` to see the backend logs in real-time.
- **Portainer**: Click the "Logs" icon on the container details page.
- Look for `[Parser]` or `[Watcher]` tags to see how the OCR interprets your files.

---

## 🛡 Privacy & Disclaimer

- **100% Local**: Aerobudget does **not** send any data to the cloud. All PDF parsing and database storage happen locally on your server.
- **Security**: The app uses JWT-based authentication. Always change the default admin password immediately.
- **Accuracy**: While the OCR is robust, always verify critical financial data manually.

---

## 📜 License & Forking

Aerobudget is released under the **MIT License**. 
- You are free to use, share, and modify the code.
- **Forks are encouraged!** If you build a parser for a specific club or add a new feature, feel free to open a Pull Request.

---

*Made with ❤️ for the General Aviation community.*
