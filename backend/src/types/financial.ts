// Shared TypeScript interfaces for the financial parsing system

export interface FinancialLineItem {
  label: string;
  value: string | number;
  currency?: string;
  unit?: string; // e.g., "millions", "thousands"
}

export interface FinancialData {
  [lineItem: string]: string | number;
}

export interface StatementData {
  [year: string]: FinancialData;
}

export interface ParsedFinancialStatements {
  company: string;
  statements: {
    income_statement: StatementData;
    balance_sheet: StatementData;
    cash_flow: StatementData;
  };
  metadata: {
    parsed_at: string;
    total_files: number;
    years_covered: string[];
    ai_provider?: string;
    model_used?: string;
  };
}

export interface PDFParseResult {
  year: number;
  filename: string;
  income_statement: FinancialData;
  balance_sheet: FinancialData;
  cash_flow: FinancialData;
  metadata?: {
    pages: number;
    text_length: number;
    extraction_confidence?: number;
  };
}

export interface ParseRequest {
  company: string;
  options?: {
    ai_provider?: "openai" | "claude" | "gemini";
    model?: string;
    temperature?: number;
    force_reparse?: boolean;
  };
}

export interface ParseResponse {
  success: boolean;
  message?: string;
  data?: ParsedFinancialStatements;
  error?: string;
  details?: string;
  suggestion?: string;
}

// Standard financial statement line items for normalization
export const STANDARD_INCOME_STATEMENT_ITEMS = [
  "Revenue",
  "Net Sales",
  "Total Revenue",
  "Cost of Sales",
  "Cost of Goods Sold",
  "Gross Profit",
  "Operating Expenses",
  "Selling and Administrative Expenses",
  "Research and Development",
  "Operating Income",
  "Operating Profit",
  "EBIT",
  "Interest Income",
  "Interest Expense",
  "Other Income",
  "Income Before Tax",
  "Tax Expense",
  "Net Income",
  "Net Profit",
  "Earnings Per Share",
  "Diluted Earnings Per Share",
] as const;

export const STANDARD_BALANCE_SHEET_ITEMS = [
  "Total Assets",
  "Current Assets",
  "Cash and Cash Equivalents",
  "Short-term Investments",
  "Trade Receivables",
  "Inventories",
  "Other Current Assets",
  "Non-current Assets",
  "Property, Plant and Equipment",
  "Intangible Assets",
  "Goodwill",
  "Investments",
  "Other Non-current Assets",
  "Total Liabilities",
  "Current Liabilities",
  "Trade Payables",
  "Short-term Debt",
  "Other Current Liabilities",
  "Non-current Liabilities",
  "Long-term Debt",
  "Deferred Tax Liabilities",
  "Other Non-current Liabilities",
  "Total Equity",
  "Share Capital",
  "Retained Earnings",
  "Other Equity",
] as const;

export const STANDARD_CASH_FLOW_ITEMS = [
  "Operating Cash Flow",
  "Cash Flow from Operations",
  "Net Income",
  "Depreciation and Amortization",
  "Changes in Working Capital",
  "Other Operating Activities",
  "Investing Cash Flow",
  "Cash Flow from Investing",
  "Capital Expenditures",
  "Acquisitions",
  "Asset Sales",
  "Other Investing Activities",
  "Financing Cash Flow",
  "Cash Flow from Financing",
  "Debt Issuance",
  "Debt Repayment",
  "Equity Issuance",
  "Dividends Paid",
  "Share Repurchases",
  "Other Financing Activities",
  "Net Change in Cash",
  "Cash and Cash Equivalents Beginning",
  "Cash and Cash Equivalents Ending",
] as const;

export type IncomeStatementItem =
  (typeof STANDARD_INCOME_STATEMENT_ITEMS)[number];
export type BalanceSheetItem = (typeof STANDARD_BALANCE_SHEET_ITEMS)[number];
export type CashFlowItem = (typeof STANDARD_CASH_FLOW_ITEMS)[number];
