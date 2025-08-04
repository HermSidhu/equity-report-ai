# AI Equity Annual Report Compiler

A full-stack TypeScript application that automatically scrapes, parses, and compiles companies' annual reports into clean, consolidated financial statements.

## Features

- 🏢 Pre-configured companies (Adyen, Heineken, ASML)
- 🤖 AI-powered PDF classification and data normalization using OpenAI GPT-4
- 📊 Automated extraction of Income Statement, Balance Sheet, and Cash Flow
- 📈 10-year consolidated financial data views
- 🎨 Modern UI with Mantine components and dark mode
- 📱 Responsive design for all devices
- 📥 Export capabilities (CSV/Excel)

## Tech Stack

### Frontend

- React 18 + TypeScript
- Vite (build tool)
- Mantine UI (component library)
- React Query (data fetching)
- Recharts (data visualization)

### Backend

- Express.js + TypeScript
- Puppeteer (web scraping)
- pdf-parse (PDF extraction)
- OpenAI API (AI classification)
- Multer (file handling)

## Project Structure

```
equity-report-ai/
├── frontend/           # React + Vite frontend
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── types/      # TypeScript interfaces
│   │   └── utils/      # Utility functions
├── backend/            # Express.js backend
│   ├── src/
│   │   ├── routes/     # API route handlers
│   │   ├── services/   # Business logic
│   │   ├── utils/      # Helper functions
│   │   └── types/      # TypeScript interfaces
└── shared/             # Shared types and utilities
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key

### 1. Environment Setup

Create `.env` files:

**Backend (.env):**

```env
PORT=3001
```

**Frontend (.env):**

```env
VITE_API_URL=http://localhost:3001
```

### 2. Installation

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 3. Development

```bash
# Run both frontend and backend concurrently
npm run dev

# Or run individually:
npm run dev:backend  # Backend on http://localhost:3001
npm run dev:frontend # Frontend on http://localhost:5173
```

### 4. Production Build

```bash
npm run build
```

## API Endpoints

- `GET /api/companies` - Get list of supported companies
- `POST /api/scrape` - Scrape annual reports from company IR website
- `POST /api/parse` - Parse financial statements from PDFs
- `POST /api/aggregate` - Generate consolidated 10-year financial tables

## Usage

1. **Select Company**: Choose from pre-configured companies
2. **Scrape Reports**: Automatically download annual reports from IR websites
3. **Parse Data**: AI extracts and classifies financial statement sections
4. **View Results**: Browse consolidated 10-year financial statements
5. **Export Data**: Download results as CSV or Excel files

## Deployment

### Frontend (Cloudflare)

```bash
cd frontend
npm run build
# Deploy to Cloudflare
```

### Backend (Render)

```bash
cd backend
npm run build
# Deploy to Render with environment variables
```

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
