export interface Company {
  id: string;
  name: string;
  ticker: string;
  country: string;
  irUrl: string;
  exchange: string;
}

export interface ScrapingProgress {
  stage:
    | "idle"
    | "scraping"
    | "parsing"
    | "aggregating"
    | "completed"
    | "error";
  progress: number;
  message: string;
  currentFile?: string;
  filesFound?: number;
  filesParsed?: number;
}

export interface FinancialStatement {
  type: "income" | "balance" | "cashflow";
  year: number;
  period: string;
  data: Record<string, number | string>;
}

export interface ConsolidatedData {
  incomeStatement: Record<string, Record<string, number | string>>;
  balanceSheet: Record<string, Record<string, number | string>>;
  cashFlow: Record<string, Record<string, number | string>>;
  years: number[];
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}
