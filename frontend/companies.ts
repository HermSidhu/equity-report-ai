// Define the Company interface
interface Company {
  id: string;
  name: string;
  ticker: string;
  country: string;
  irUrl: string;
  exchange: string;
}

// Hardcoded companies
const COMPANIES: Company[] = [
  {
    id: "novonordisk",
    name: "Novo Nordisk",
    ticker: "NOVO-B.CO",
    country: "Denmark",
    irUrl: "https://www.novonordisk.com/investors/annual-report.html",
    exchange: "Copenhagen Stock Exchange",
  },
  {
    id: "stellantis",
    name: "Stellantis",
    ticker: "STLAM.MI",
    country: "Netherlands",
    irUrl:
      "https://www.stellantis.com/en/investors/reporting/financial-reports",
    exchange: "Milan Stock Exchange",
  },
  {
    id: "sanofi",
    name: "Sanofi",
    ticker: "SAN.PA",
    country: "France",
    irUrl:
      "https://www.sanofi.com/en/investors/financial-reports-and-regulated-information",
    exchange: "Paris Stock Exchange",
  },
];

export { COMPANIES };
export type { Company };
