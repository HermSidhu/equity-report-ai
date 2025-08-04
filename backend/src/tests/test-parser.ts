#!/usr/bin/env ts-node

/**
 * Test script for the financial statement parser
 * Usage: npm run test:parser -- <company_code>
 */

import { parseFinancialStatements } from "../services/parser";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: require("path").join(__dirname, "../../.env") });

async function testParser() {
  const companyCode = process.argv[2];

  if (!companyCode) {
    console.log("Usage: npm run test:parser -- <company_code>");
    console.log("Example: npm run test:parser -- novonordisk");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY environment variable not set");
    process.exit(1);
  }

  try {
    console.log(`🧪 Testing parser for company: ${companyCode}`);
    console.log("=".repeat(50));

    const result = await parseFinancialStatements(companyCode);

    console.log("✅ Parsing completed successfully!");
    console.log("📊 Results summary:");
    console.log(`   Company: ${result.company}`);
    console.log(`   Total files parsed: ${result.metadata.total_files}`);
    console.log(
      `   Years covered: ${result.metadata.years_covered.join(", ")}`
    );
    console.log(`   AI Provider: ${result.metadata.ai_provider}`);
    console.log(`   Model: ${result.metadata.model_used}`);

    console.log("\n📈 Statement data available:");
    console.log(
      `   Income Statement: ${
        Object.keys(result.statements.income_statement).length
      } years`
    );
    console.log(
      `   Balance Sheet: ${
        Object.keys(result.statements.balance_sheet).length
      } years`
    );
    console.log(
      `   Cash Flow: ${Object.keys(result.statements.cash_flow).length} years`
    );

    // Show sample data for the most recent year
    const latestYear =
      result.metadata.years_covered[result.metadata.years_covered.length - 1];
    if (latestYear && result.statements.income_statement[latestYear]) {
      console.log(`\n💰 Sample Income Statement data for ${latestYear}:`);
      const incomeData = result.statements.income_statement[latestYear];
      Object.entries(incomeData)
        .slice(0, 5)
        .forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
    }
  } catch (error: any) {
    console.error("❌ Parser test failed:", error.message);

    if (error.message.includes("not found")) {
      console.log(
        "\n💡 Suggestion: Make sure you have downloaded annual reports first"
      );
      console.log(
        '   Use: curl -X POST http://localhost:5050/api/download/annual_report -d \'{"ir_url":"<company_ir_url>"}\''
      );
    }

    process.exit(1);
  }
}

testParser();
