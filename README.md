AI Equity Annual Report Compiler
Overview
AI Equity Annual Report Compiler is a Node.js + TypeScript application that automatically scrapes, downloads, and processes annual financial reports (PDFs) from public European companies’ Investor Relations (IR) pages.

The goal:

Scrape annual reports for the last 10 years (starting at 2024) from the company’s IR site.

Download PDFs (only true Annual Reports, IFRS/GAAP format, excluding sustainability/tax reports).

Parse the reports into structured financial statements:

Income Statement

Balance Sheet

Cash Flow Statement

Normalize the extracted data into a clean 10-year view for each statement.

Output the data in JSON or CSV format for easy consumption.

Features
Scrapes Investor Relations pages dynamically using Puppeteer (with Cheerio fallback for static sites).

Handles dynamic JavaScript-rendered pages like ASML.

Filters out irrelevant PDFs:

✅ Annual Reports, Integrated Reports

❌ Sustainability, ESG, Tax, Interim, Presentations

Deduplicates links before download.

Downloads reports into:

bash
/annual_reports/[company-domain]/
Uses OpenAI API (or Claude later) for parsing PDFs into structured financial data.

Tech Stack
Backend: Node.js, Express, TypeScript

Scraping: Puppeteer + Cheerio

Parsing PDFs: pdf-parse / pdfplumber + OpenAI GPT-4 for text interpretation

Frontend (planned): React + Vite + Mantine UI

AI Models: OpenAI GPT-4 / Claude for financial table extraction & normalization

Architecture
yaml
backend/
├── annual_reports/ # Saved reports organized by company
│ └── www_asml_com/
│ ├── 2024-Annual-Report-IFRS.pdf
│ ├── 2024-Annual-Report-GAAP.pdf
│ └── ...
├── src/
│ ├── routes/
│ │ └── download.ts # Express route for scraping + downloading reports
│ ├── services/
│ │ ├── scraper.ts # Scrapes IR page, finds annual report links
│ │ ├── downloader.ts # Downloads and saves reports with clean names
│ │ └── normalizer.ts # (Planned) Normalize extracted data
│ └── index.ts # Express app entry
└── .env # API keys, configs
API Design
POST /api/download/annual_report
Download annual reports for a given company.

Request:

json
{
"ir_url": "https://www.asml.com/en/investors/annual-report"
}
Response:

json
{
"count": 10,
"files": [
"annual_reports/www_asml_com/2023-ASML-Annual-Report-IFRS.pdf",
"annual_reports/www_asml_com/2023-ASML-Annual-Report-GAAP.pdf"
],
"years": [2023, 2022, 2021, ...]
}

Workflow
Scrape IR page for yearly links.

Extract PDF URLs (filter only annual/integrated reports).

Download PDFs with clean, normalized filenames.

Extract financial tables (Income, Balance Sheet, Cash Flow).

Normalize & Deduplicate rows based on latest filings.

Output structured JSON or CSV.

Usage
Install dependencies:
bash
npm install
Run development server:
bash
npm run dev
Test API:
bash
curl -X POST http://localhost:5050/api/download/annual_report \
 -H "Content-Type: application/json" \
 -d '{"ir_url": "https://www.asml.com/en/investors/annual-report"}'
Future Enhancements
AI Parsing Phase:

Use OpenAI GPT-4 to extract tables from PDFs.

Normalize item names across years.

Handle multi-currency conversion.

Web UI:

Upload custom PDFs.

Visualize 10-year financial trends.

Database Integration (optional):

Store normalized data in PostgreSQL or Supabase.

Key Goals for Copilot / AI Assistants
Generate TypeScript code for Express routes, Puppeteer scraping, and PDF parsing.

Ensure scraping logic:

✅ Handles dynamic JS rendering.

✅ Downloads only correct PDFs (Annual, IFRS/GAAP).

✅ Deduplicates and names files consistently.

Implement AI-driven normalization for financial tables.

Maintain modular and scalable code structure.
