# AI Equity Annual Report Compiler

A full-stack TypeScript application that automatically scrapes, parses, and compiles companies' annual reports into clean, consolidated financial statements.

## Features

- 🔍 **Intelligent Web Scraping**: Automatically discovers and downloads annual report PDFs from company investor relations websites
- 🤖 **AI-Powered PDF Parsing**: Uses OpenAI GPT-4o to extract and normalize financial data from complex PDF documents
- 📊 **Financial Statement Extraction**: Automated extraction of Income Statement, Balance Sheet, and Cash Flow statements
- 📈 **Multi-Year Data Consolidation**: Processes and consolidates up to 10 years of financial data
- 🎨 **Modern UI**: Clean interface built with Mantine components and React Query for state management
- 📥 **Data Export**: Access to structured financial data in JSON format
- 🔧 **Robust Error Handling**: Comprehensive error handling and status tracking
- ⚡ **Real-time Progress**: Live updates during scraping and parsing operations

## Tech Stack

### Frontend

- React 18 + TypeScript
- Vite (build tool)
- Mantine v7 UI (component library)
- TanStack React Query v5 (data fetching & state management)
- Recharts (data visualization)
- Axios (HTTP client)

### Backend

- Express.js + TypeScript
- Puppeteer (web scraping & browser automation)
- pdf-parse (PDF text extraction)
- OpenAI GPT-4o (AI-powered financial data extraction)
- File system management for data pipeline
- Comprehensive API error handling

## How It Works

### Web Scraping Engine

The application uses Puppeteer to intelligently scrape company investor relations pages:

- **Smart PDF Detection**: Automatically identifies annual reports vs. other documents (sustainability, quarterly, etc.)
- **Multi-Strategy Scraping**: Handles various website architectures including iframe-embedded content
- **Annual Report Filtering**: Uses sophisticated text analysis to filter out non-annual reports
- **Year Extraction**: Automatically extracts report years from filenames and content
- **Robust Downloads**: Handles redirects, various PDF hosting services, and download authentication

### AI-Powered Financial Parser

The backend includes a sophisticated AI-powered financial statement parser that:

- **Text Extraction**: Converts PDF documents to searchable text using pdf-parse
- **Intelligent Analysis**: Uses OpenAI GPT-4o to identify and extract financial statement sections
- **Data Normalization**: Converts various financial reporting formats into standardized JSON structures
- **Multi-Year Processing**: Handles data from multiple years with deduplication and consistency checks
- **Quality Validation**: Validates extracted data for completeness and accuracy

### Financial Statement Types Supported

The system extracts and normalizes the following statement types:

**Income Statement**: Revenue, Net Sales, Cost of Sales, Gross Profit, Operating Expenses, R&D, Operating Income, Interest Income/Expense, Income Before Tax, Tax Expense, Net Income, Earnings Per Share

**Balance Sheet**: Total Assets, Current/Non-current Assets, Cash and Cash Equivalents, Trade Receivables, Inventory, PPE, Intangible Assets, Goodwill, Total Liabilities, Current/Non-current Liabilities, Debt, Total Equity, Share Capital, Retained Earnings

**Cash Flow Statement**: Operating Cash Flow, Investing Cash Flow, Financing Cash Flow, Net Change in Cash, with detailed breakdowns including depreciation, working capital changes, capex, acquisitions, debt issuance, dividends, and share repurchases

### Data Processing Pipeline

1. **PDF Text Extraction**: Extracts up to 100,000 characters per PDF for analysis
2. **AI Processing**: Uses structured prompts with financial terminology mapping to identify statement sections
3. **Data Normalization**: Converts various financial reporting formats into standardized JSON structures with consistent line item names
4. **Data Validation**: Ensures extracted values are properly formatted and reasonable
5. **Multi-Year Consolidation**: Merges data across years with conflict resolution and validation
6. **Individual Year Storage**: Saves parsed data for each year in separate JSON files
7. **Compiled Output**: Creates final consolidated multi-year financial statements

### API Endpoints

#### Annual Report Service

- `POST /api/annual_reports/download` - Scrape and download annual reports from company IR website
  - Body: `{ "ir_url": "https://company-ir-website.com" }`
  - Downloads last 10 years of annual reports automatically

#### Parsing Service

- `POST /api/parse` - Parse financial statements from downloaded PDFs using AI
  - Body: `{ "company": "company-folder-name" }`
  - Returns: Structured financial data with Income Statement, Balance Sheet, and Cash Flow
- `GET /api/parse/status` - Check parsing service health and configuration
- `GET /api/parse/companies` - List available, parsed, and compiled companies

### Data Storage Structure

```
backend/storage/
├── annual_reports/[company]/    # Raw downloaded PDF files organized by company
├── parsed_data/[company]/       # AI-extracted JSON data from each PDF (by year)
├── compiled_data/               # Consolidated multi-year financial data
│   └── [company].json          # Final normalized financial statements
└── csv/                        # Generated CSV exports
    ├── [company]_test.csv      # Individual company test exports
    └── comparison_*.csv        # Multi-company comparison files
```

### Error Handling & Status Tracking

- **Comprehensive Validation**: Input validation with helpful error messages
- **AI Service Monitoring**: OpenAI API key validation and rate limit handling
- **File System Checks**: Automatic directory creation and file existence validation
- **Progress Tracking**: Real-time status updates during scraping and parsing
- **Graceful Failures**: Detailed error responses with actionable suggestions

## Project Structure

```
equity-report-ai/
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components (CompanyCard, FinancialTable, ProgressTracker)
│   │   ├── hooks/              # Custom React hooks (useApi.ts for API calls)
│   │   ├── types/              # TypeScript interfaces and types
│   │   ├── utils/              # Utility functions (api.ts for HTTP client)
│   │   ├── App.tsx             # Main application component
│   │   └── main.tsx            # Application entry point
│   ├── index.html              # HTML template
│   ├── package.json
│   ├── postcss.config.cjs      # PostCSS configuration for Mantine
│   ├── tsconfig.json           # TypeScript configuration
│   ├── tsconfig.node.json      # Node TypeScript configuration
│   └── vite.config.ts          # Vite configuration
├── backend/                    # Express.js backend
│   ├── src/
│   │   ├── routes/             # API route handlers
│   │   │   ├── download.ts     # PDF download endpoints
│   │   │   └── parse.ts        # Financial parsing endpoints
│   │   ├── services/           # Business logic
│   │   │   ├── parser.ts       # AI-powered PDF parsing logic
│   │   │   └── reportProcessor.ts # Web scraping and download logic
│   │   ├── types/              # TypeScript interfaces (financial.ts)
│   │   ├── tests/              # Test scripts for debugging
│   │   └── index.ts            # Server entry point
│   ├── test/                   # API endpoint tests
│   │   ├── download/           # Download endpoint tests by company
│   │   ├── parse/              # Parse endpoint tests by company
│   │   └── test-all.ts         # Comprehensive test runner
│   ├── storage/                # Data storage directories
│   │   ├── annual_reports/     # Downloaded PDF files by company
│   │   ├── parsed_data/        # Individual year JSON extracts
│   │   └── compiled_data/      # Consolidated financial data
│   ├── package.json
│   └── tsconfig.json           # TypeScript configuration
└── README.md                   # Project documentation
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key (for AI-powered financial data extraction)

### 1. Environment Setup

Create `.env` files in the appropriate directories:

**Backend (.env):**

```env
PORT=5050
OPENAI_API_KEY=your_openai_api_key_here
```

**Frontend (.env):**

```env
VITE_API_URL=http://localhost:5050
```

### 2. Installation

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 3. Development

Start the development servers:

```bash
# Backend only
cd backend && npm run dev
# Backend runs on http://localhost:5050

# Frontend only (in a new terminal)
cd frontend && npm run dev
# Frontend runs on http://localhost:5173
```

For debugging and testing:

```bash
# Test the financial parser on a specific company
cd backend && npm run test:parser -- company-name

# Check parser service status
curl http://localhost:5050/api/parse/status

# Run comprehensive API tests for all companies
cd backend && npm run test:all

# Test individual company annual report downloads
cd backend && npm run test:annual_reports:novonordisk
cd backend && npm run test:annual_reports:stellantis
cd backend && npm run test:annual_reports:sanofi

# Test individual company parsing
cd backend && npm run test:parse:novonordisk
cd backend && npm run test:parse:stellantis
cd backend && npm run test:parse:sanofi

# Test CSV export functionality
cd backend && npm run test:csv
```

### 4. Production Build

```bash
# Build frontend
cd frontend && npm run build

# Build backend
cd backend && npm run build
```

## API Endpoints

### Annual Report Service

- `POST /api/annual_reports/download` - Scrape and download annual reports from company IR website
  - Body: `{ "ir_url": "https://company-investor-relations-url" }`
  - Returns: Download summary with company name, file count, and years processed

### Parsing Service

- `POST /api/parse` - Parse financial statements from downloaded PDFs using AI
  - Body: `{ "company": "company-folder-name" }`
  - Returns: Structured financial data with Income Statement, Balance Sheet, and Cash Flow
- `GET /api/parse/status` - Check parsing service health and configuration
- `GET /api/parse/companies` - List available, parsed, and compiled companies

### CSV Export Service

- `GET /api/csv/companies` - List all companies available for CSV export
- `GET /api/csv/download/:company` - Download CSV file for a specific company
- `GET /api/csv/preview/:company?limit=50` - Preview CSV structure without downloading (JSON format)
- `POST /api/csv/compare` - Generate comparative CSV for multiple companies
  - Body: `{ "companies": ["company1", "company2", ...] }`

## Usage

1. **Download Reports**: Provide a company's investor relations URL to automatically scrape and download annual report PDFs
2. **Parse Financials**: Use AI to extract structured financial data from downloaded PDFs
3. **View Consolidated Data**: Browse multi-year financial statements with normalized line items
4. **Export Data**: Download processed financial data in JSON format

### Example API Usage

```bash
# 1. Download annual reports for a company
curl -X POST http://localhost:5050/api/annual_report/download \
  -H "Content-Type: application/json" \
  -d '{"ir_url": "https://company-ir-website.com"}'

# 2. Parse the downloaded PDFs
curl -X POST http://localhost:5050/api/parse \
  -H "Content-Type: application/json" \
  -d '{"company": "company-folder-name"}'

# 3. Check available companies
curl http://localhost:5050/api/parse/companies

# 4. Check service status
curl http://localhost:5050/api/parse/status

# 5. Download CSV for a company
curl http://localhost:5050/api/csv/download/novonordisk -o novonordisk_financials.csv

# 6. Preview CSV structure
curl http://localhost:5050/api/csv/preview/novonordisk?limit=10

# 7. Generate comparative CSV for multiple companies
curl -X POST http://localhost:5050/api/csv/compare \
  -H "Content-Type: application/json" \
  -d '{"companies": ["novonordisk", "stellantis"]}' \
  -o financial_comparison.csv

# 8. List companies available for CSV export
curl http://localhost:5050/api/csv/companies
```

### Example Companies

The system has been tested with the following companies:

1. **Novo Nordisk**

   - IR URL: https://www.novonordisk.com/sustainable-business/esg-portal/integrated-reporting.html
   - Company Code: `novonordisk`

2. **Stellantis**

   - IR URL: https://www.stellantis.com/en/investors/reporting/financial-reports
   - Company Code: `stellantis`

3. **Sanofi**
   - IR URL: https://www.sanofi.com/en/investors/financial-reports-and-regulated-information
   - Company Code: `sanofi`

## Deployment

### Backend (Production)

```bash
cd backend
npm run build
npm start
```

Set the following environment variables:

- `PORT` - Server port (default: 5050)
- `OPENAI_API_KEY` - Your OpenAI API key

### Frontend (Production)

```bash
cd frontend
npm run build
npm run preview
```

Set the following environment variable:

- `VITE_API_URL` - Backend API URL (e.g., https://your-backend.com)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open a GitHub issue.
