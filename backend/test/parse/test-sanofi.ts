#!/usr/bin/env ts-node

/**
 * Test script for parsing Sanofi annual reports
 * Usage: npm run test:parse:sanofi
 */

import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: require("path").join(__dirname, "../../.env") });

const API_BASE_URL = process.env.API_URL || "http://localhost:5050";
const COMPANY_CODE = "sanofi";

async function testSanofiParse() {
  try {
    console.log("🧪 Testing Sanofi Financial Statement Parsing");
    console.log("=".repeat(60));
    console.log(`🏢 Company: ${COMPANY_CODE}`);
    console.log(`🚀 API Endpoint: ${API_BASE_URL}/api/parse`);
    console.log("=".repeat(60));

    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY environment variable not set");
      console.error(
        "   💡 Make sure to set your OpenAI API key in the .env file"
      );
      process.exit(1);
    }

    const startTime = Date.now();

    const response = await axios.post(
      `${API_BASE_URL}/api/parse`,
      {
        company: COMPANY_CODE,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 600000, // 10 minutes timeout for AI processing
      }
    );

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log("✅ SUCCESS! Parsing completed successfully");
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log("📊 Parsing results summary:");
    console.log(`   Company: ${response.data.data.company}`);
    console.log(
      `   Total files parsed: ${response.data.data.metadata.total_files}`
    );
    console.log(
      `   Years covered: ${response.data.data.metadata.years_covered.join(
        ", "
      )}`
    );
    console.log(`   AI Provider: ${response.data.data.metadata.ai_provider}`);
    console.log(`   Model: ${response.data.data.metadata.model_used}`);

    console.log("\n📈 Statement data available:");
    console.log(
      `   Income Statement: ${
        Object.keys(response.data.data.statements.income_statement).length
      } years`
    );
    console.log(
      `   Balance Sheet: ${
        Object.keys(response.data.data.statements.balance_sheet).length
      } years`
    );
    console.log(
      `   Cash Flow: ${
        Object.keys(response.data.data.statements.cash_flow).length
      } years`
    );

    // Show sample data for the most recent year
    const latestYear =
      response.data.data.metadata.years_covered[
        response.data.data.metadata.years_covered.length - 1
      ];
    if (
      latestYear &&
      response.data.data.statements.income_statement[latestYear]
    ) {
      console.log(`\n💰 Sample Income Statement data for ${latestYear}:`);
      const incomeData =
        response.data.data.statements.income_statement[latestYear];
      Object.entries(incomeData)
        .slice(0, 5)
        .forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
    }

    console.log("\n🔗 Full response structure:");
    console.log("   data.success:", response.data.success);
    console.log("   data.message:", response.data.message);
    console.log("   data.data.company:", response.data.data.company);
    console.log(
      "   data.data.metadata:",
      JSON.stringify(response.data.data.metadata, null, 2)
    );
  } catch (error: any) {
    console.error("❌ Parsing test failed:");

    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(
        `   Error: ${error.response.data?.error || error.response.statusText}`
      );
      if (error.response.data?.details) {
        console.error(`   Details: ${error.response.data.details}`);
      }
      if (error.response.data?.suggestion) {
        console.error(`   💡 Suggestion: ${error.response.data.suggestion}`);
      }
    } else if (error.code === "ECONNREFUSED") {
      console.error(
        "   💡 Make sure the backend server is running on",
        API_BASE_URL
      );
    } else if (error.code === "ECONNABORTED") {
      console.error(
        "   💡 Request timed out - AI parsing can take several minutes"
      );
    } else {
      console.error("   Details:", error.message);
    }

    process.exit(1);
  }
}

if (require.main === module) {
  testSanofiParse();
}

export { testSanofiParse };
