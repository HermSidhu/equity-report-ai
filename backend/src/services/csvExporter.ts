import fs from "fs";
import path from "path";
import { ParsedFinancialStatements } from "../types/financial";

interface CSVRow {
  [key: string]: string | number;
}

/**
 * Convert financial data to CSV format
 */
export class CSVExporter {
  /**
   * Generate CSV content for a company's financial statements
   */
  static generateCSV(data: ParsedFinancialStatements): string {
    const rows: CSVRow[] = [];

    // Get all years covered
    const years = data.metadata.years_covered.sort();

    // Create headers
    const headers = ["Statement", "Item", ...years];

    // Process each statement type
    const statementTypes = [
      "income_statement",
      "balance_sheet",
      "cash_flow",
    ] as const;

    for (const statementType of statementTypes) {
      const statementData = data.statements[statementType];

      // Get all unique items across all years
      const allItems = new Set<string>();
      for (const year of years) {
        if (statementData[year]) {
          Object.keys(statementData[year]).forEach((item) =>
            allItems.add(item)
          );
        }
      }

      // Create rows for each item
      for (const item of Array.from(allItems).sort()) {
        const row: CSVRow = {
          Statement: this.formatStatementName(statementType),
          Item: item,
        };

        // Add data for each year
        for (const year of years) {
          const value = statementData[year]?.[item] || "N/A";
          row[year] = value;
        }

        rows.push(row);
      }
    }

    // Convert to CSV string
    return this.rowsToCSV(headers, rows);
  }

  /**
   * Generate comparative CSV for multiple companies
   */
  static generateComparativeCSV(companies: string[]): string {
    const compiledDataDir = path.join(__dirname, "../../storage/compiled_data");
    const companyData: { [company: string]: ParsedFinancialStatements } = {};

    // Load data for each company
    for (const company of companies) {
      const filePath = path.join(compiledDataDir, `${company}.json`);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        companyData[company] = data;
      }
    }

    if (Object.keys(companyData).length === 0) {
      throw new Error("No compiled data found for the specified companies");
    }

    // Get all years across all companies
    const allYears = new Set<string>();
    Object.values(companyData).forEach((data) => {
      data.metadata.years_covered.forEach((year) => allYears.add(year));
    });
    const sortedYears = Array.from(allYears).sort();

    const rows: CSVRow[] = [];
    const statementTypes = [
      "income_statement",
      "balance_sheet",
      "cash_flow",
    ] as const;

    for (const statementType of statementTypes) {
      // Get all unique items across all companies
      const allItems = new Set<string>();
      Object.values(companyData).forEach((data) => {
        const statementData = data.statements[statementType];
        Object.values(statementData).forEach((yearData) => {
          Object.keys(yearData).forEach((item) => allItems.add(item));
        });
      });

      for (const item of Array.from(allItems).sort()) {
        for (const year of sortedYears) {
          const row: CSVRow = {
            Statement: this.formatStatementName(statementType),
            Item: item,
            Year: year,
          };

          // Add data for each company
          for (const company of companies) {
            const data = companyData[company];
            const value =
              data?.statements[statementType][year]?.[item] || "N/A";
            row[this.formatCompanyName(company)] = value;
          }

          rows.push(row);
        }
      }
    }

    // Create headers
    const headers = [
      "Statement",
      "Item",
      "Year",
      ...companies.map((c) => this.formatCompanyName(c)),
    ];

    return this.rowsToCSV(headers, rows);
  }

  /**
   * Get list of available companies for CSV export
   */
  static getAvailableCompanies(): string[] {
    const compiledDataDir = path.join(__dirname, "../../storage/compiled_data");

    if (!fs.existsSync(compiledDataDir)) {
      return [];
    }

    return fs
      .readdirSync(compiledDataDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""));
  }

  /**
   * Generate CSV for a specific company
   */
  static generateCompanyCSV(companyCode: string): string {
    const compiledDataDir = path.join(__dirname, "../../storage/compiled_data");
    const filePath = path.join(compiledDataDir, `${companyCode}.json`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`No compiled data found for company: ${companyCode}`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return this.generateCSV(data);
  }

  /**
   * Helper method to format statement names
   */
  private static formatStatementName(statementType: string): string {
    const names = {
      income_statement: "Income Statement",
      balance_sheet: "Balance Sheet",
      cash_flow: "Cash Flow Statement",
    };
    return names[statementType as keyof typeof names] || statementType;
  }

  /**
   * Helper method to format company names
   */
  private static formatCompanyName(companyCode: string): string {
    return companyCode
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Convert rows to CSV string
   */
  private static rowsToCSV(headers: string[], rows: CSVRow[]): string {
    const csvLines: string[] = [];

    // Add headers
    csvLines.push(headers.map((h) => this.escapeCSVField(h)).join(","));

    // Add data rows
    for (const row of rows) {
      const line = headers
        .map((header) => {
          const value = row[header];
          return this.escapeCSVField(value?.toString() || "");
        })
        .join(",");
      csvLines.push(line);
    }

    return csvLines.join("\n");
  }

  /**
   * Escape CSV field if it contains special characters
   */
  private static escapeCSVField(field: string): string {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}
