import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import OpenAI from "openai";
import {
  FinancialData,
  StatementData,
  ParsedFinancialStatements,
  PDFParseResult,
  STANDARD_INCOME_STATEMENT_ITEMS,
  STANDARD_BALANCE_SHEET_ITEMS,
  STANDARD_CASH_FLOW_ITEMS,
} from "../types/financial";

// Note: OpenAI client initialized in functions to avoid env loading issues

/**
 * Extract company name from folder path
 */
function extractCompanyName(companyCode: string): string {
  return companyCode
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Extract year from filename
 */
function extractYearFromFilename(filename: string): number | null {
  const yearMatch = filename.match(/\b(20[0-9]{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 2014 && year <= 2024) {
      return year;
    }
  }
  return null;
}

/**
 * Create OpenAI prompt for financial statement extraction
 */
function createExtractionPrompt(pdfText: string, year: number): string {
  return `You are a financial analyst expert. Extract financial data from this annual report for year ${year}.

INSTRUCTIONS:
1. Extract ONLY the main financial statements: Income Statement, Balance Sheet, and Cash Flow Statement
2. Return data as JSON with this exact structure:
{
  "income_statement": {
    "Revenue": "value_in_millions",
    "Cost of Sales": "value_in_millions", 
    "Gross Profit": "value_in_millions",
    "Operating Expenses": "value_in_millions",
    "Operating Income": "value_in_millions",
    "Net Income": "value_in_millions"
  },
  "balance_sheet": {
    "Total Assets": "value_in_millions",
    "Current Assets": "value_in_millions",
    "Non-current Assets": "value_in_millions", 
    "Total Liabilities": "value_in_millions",
    "Current Liabilities": "value_in_millions",
    "Non-current Liabilities": "value_in_millions",
    "Total Equity": "value_in_millions"
  },
  "cash_flow": {
    "Operating Cash Flow": "value_in_millions",
    "Investing Cash Flow": "value_in_millions", 
    "Financing Cash Flow": "value_in_millions",
    "Net Change in Cash": "value_in_millions",
    "Cash and Cash Equivalents": "value_in_millions"
  }
}

MAPPING RULES - Look for these equivalent terms:
Revenue: "Net sales", "Revenue", "Sales", "Total revenue"
Cost of Sales: "Cost of goods sold", "Cost of sales", "COGS", "Cost of revenue"
Gross Profit: "Gross profit", "Gross margin", "Gross income"
Operating Expenses: Sum of "Sales and distribution", "Research and development", "Administrative", "General and administrative", "SG&A", "Operating expenses"
Operating Income: "Operating profit", "Operating income", "EBIT", "Earnings before interest and tax"
Net Income: "Net profit", "Net income", "Net earnings", "Profit for the year", "Net profit for the year"

Total Assets: "Total assets"
Current Assets: "Current assets" 
Non-current Assets: "Non-current assets", "Fixed assets", "Property, plant and equipment plus intangibles"
Total Liabilities: "Total liabilities"
Current Liabilities: "Current liabilities", "Short-term liabilities"
Non-current Liabilities: "Non-current liabilities", "Long-term liabilities"
Total Equity: "Total equity", "Shareholders' equity", "Total shareholders' equity"

Operating Cash Flow: "Cash flow from operating activities", "Operating cash flow", "Net cash from operating activities"
Investing Cash Flow: "Cash flow from investing activities", "Investing cash flow", "Net cash from investing activities"
Financing Cash Flow: "Cash flow from financing activities", "Financing cash flow", "Net cash from financing activities"

EXTRACTION RULES:
- Extract values in millions (remove "DKK million", "EUR million", etc.)
- For Operating Expenses, if not explicitly stated, sum individual expense line items
- Look for the specific year ${year} data only
- Values should be numeric strings without currency symbols
- Use "-" prefix for negative values
- If truly not found after thorough search, use "N/A" not "0"
- Focus on the consolidated financial statements section
- Ignore segment or geographical breakdowns

ANNUAL REPORT TEXT (showing more context):
${pdfText.substring(0, 100000)} // Increased from 50k to 100k characters

Return ONLY the JSON object, no explanations.`;
}

/**
 * Parse a single PDF file using OpenAI
 */
export async function parsePDFWithAI(
  filePath: string,
  year: number
): Promise<PDFParseResult | null> {
  try {
    console.log(`📖 Parsing PDF: ${path.basename(filePath)} for year ${year}`);

    // Extract text from PDF
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);

    if (!pdfData.text || pdfData.text.length < 1000) {
      console.log(
        `⚠️  PDF text too short or empty: ${path.basename(filePath)}`
      );
      return null;
    }

    console.log(`📄 Extracted ${pdfData.text.length} characters from PDF`);

    // Create prompt and call OpenAI
    const prompt = createExtractionPrompt(pdfData.text, year);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log(`🤖 Sending to OpenAI for analysis...`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using for cost efficiency, can be changed to gpt-4o
      messages: [
        {
          role: "system",
          content:
            "You are a financial data extraction expert. Return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 1000000,
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      console.log(`❌ No response from OpenAI for ${path.basename(filePath)}`);
      return null;
    }

    console.log(`✅ Received AI response (${aiResponse.length} chars)`);

    // Parse JSON response
    let parsedData: any;
    try {
      // Clean the response to extract JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.log(`❌ Failed to parse AI JSON response:`, parseError);
      console.log(`Raw response:`, aiResponse.substring(0, 500));
      return null;
    }

    // Validate structure
    if (
      !parsedData.income_statement ||
      !parsedData.balance_sheet ||
      !parsedData.cash_flow
    ) {
      console.log(
        `❌ Invalid AI response structure for ${path.basename(filePath)}`
      );
      return null;
    }

    console.log(`✅ Successfully parsed ${path.basename(filePath)}`);

    return {
      year,
      filename: path.basename(filePath),
      income_statement: parsedData.income_statement,
      balance_sheet: parsedData.balance_sheet,
      cash_flow: parsedData.cash_flow,
    };
  } catch (error) {
    console.error(`❌ Error parsing PDF ${filePath}:`, error);
    return null;
  }
}

/**
 * Normalize and merge financial data across years
 */
function normalizeFinancialData(
  parseResults: PDFParseResult[]
): ParsedFinancialStatements["statements"] {
  const statements: ParsedFinancialStatements["statements"] = {
    income_statement: {},
    balance_sheet: {},
    cash_flow: {},
  };

  // Sort by year (most recent first for deduplication)
  const sortedResults = parseResults.sort((a, b) => b.year - a.year);

  // Track which years we've seen for each statement type
  const processedYears = {
    income_statement: new Set<number>(),
    balance_sheet: new Set<number>(),
    cash_flow: new Set<number>(),
  };

  for (const result of sortedResults) {
    const yearStr = result.year.toString();

    // Process each statement type
    (["income_statement", "balance_sheet", "cash_flow"] as const).forEach(
      (statementType) => {
        if (!processedYears[statementType].has(result.year)) {
          statements[statementType][yearStr] = result[statementType];
          processedYears[statementType].add(result.year);
          console.log(`📊 Added ${statementType} data for ${yearStr}`);
        } else {
          console.log(
            `⚠️  Skipping duplicate ${statementType} data for ${yearStr}`
          );
        }
      }
    );
  }

  return statements;
}

/**
 * Main function to parse financial statements for a company
 */
export async function parseFinancialStatements(
  companyCode: string
): Promise<ParsedFinancialStatements> {
  console.log(`🏢 Starting financial statement parsing for: ${companyCode}`);

  const reportsDir = path.join(
    __dirname,
    "../../storage/annual_reports",
    companyCode
  );
  const parsedDataDir = path.join(
    __dirname,
    "../../storage/parsed_data",
    companyCode
  );
  const compiledDataDir = path.join(__dirname, "../../storage/compiled_data");

  // Check if reports directory exists
  if (!fs.existsSync(reportsDir)) {
    throw new Error(`Reports directory not found: ${reportsDir}`);
  }

  // Create directory structure if it doesn't exist
  if (!fs.existsSync(parsedDataDir)) {
    fs.mkdirSync(parsedDataDir, { recursive: true });
    console.log(`📁 Created parsed_data directory: ${parsedDataDir}`);
  }

  if (!fs.existsSync(compiledDataDir)) {
    fs.mkdirSync(compiledDataDir, { recursive: true });
    console.log(`📁 Created compiled_data directory: ${compiledDataDir}`);
  }

  // Get all PDF files
  const files = fs
    .readdirSync(reportsDir)
    .filter((file) => file.toLowerCase().endsWith(".pdf"));

  if (files.length === 0) {
    throw new Error(`No PDF files found in: ${reportsDir}`);
  }

  console.log(`📚 Found ${files.length} PDF files to parse`);

  // Parse each PDF file
  const parseResults: PDFParseResult[] = [];

  for (const file of files) {
    const filePath = path.join(reportsDir, file);
    const year = extractYearFromFilename(file);

    if (!year) {
      console.log(`⚠️  Skipping file with no identifiable year: ${file}`);
      continue;
    }

    const result = await parsePDFWithAI(filePath, year);
    if (result) {
      parseResults.push(result);

      // Save individual year data to parsed_data/company/year.json
      const yearDataPath = path.join(parsedDataDir, `${year}.json`);
      const yearData = {
        company: extractCompanyName(companyCode),
        year: year,
        source_file: file,
        parsed_at: new Date().toISOString(),
        income_statement: result.income_statement,
        balance_sheet: result.balance_sheet,
        cash_flow: result.cash_flow,
        ai_provider: "OpenAI",
        model_used: "gpt-4o",
      };
      fs.writeFileSync(yearDataPath, JSON.stringify(yearData, null, 2));
      console.log(`💾 Saved ${year} data to: ${yearDataPath}`);
    }

    // Add delay between API calls to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (parseResults.length === 0) {
    throw new Error("Failed to parse any PDF files");
  }

  console.log(`✅ Successfully parsed ${parseResults.length} files`);

  // Normalize and merge data
  const statements = normalizeFinancialData(parseResults);
  const years = parseResults.map((r) => r.year.toString()).sort();

  const result: ParsedFinancialStatements = {
    company: extractCompanyName(companyCode),
    statements,
    metadata: {
      parsed_at: new Date().toISOString(),
      total_files: parseResults.length,
      years_covered: years,
      ai_provider: "OpenAI",
      model_used: "gpt-4o",
    },
  };

  // Save consolidated result to compiled_data/company.json
  const outputPath = path.join(compiledDataDir, `${companyCode}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`💾 Saved compiled financials to: ${outputPath}`);

  return result;
}

/**
 * Alternative AI provider interface for future extensibility
 */
export interface AIProvider {
  name: string;
  extractFinancialData(text: string, year: number): Promise<any>;
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async extractFinancialData(text: string, year: number) {
    const prompt = createExtractionPrompt(text, year);

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a financial data extraction expert. Return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000000,
    });

    return response.choices[0]?.message?.content;
  }
}
