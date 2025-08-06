#!/usr/bin/env ts-node

/**
 * Comprehensive test runner for all API endpoints and companies
 * Usage: npm run test:all
 */

import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: require("path").join(__dirname, "../.env") });

const API_BASE_URL = process.env.API_URL || "http://localhost:5050";

interface TestResults {
  endpoint: string;
  company: string;
  success: boolean;
  duration: number;
  error?: string;
}

const COMPANIES = [
  {
    name: "Novo Nordisk",
    code: "novonordisk",
    irUrl:
      "https://www.novonordisk.com/sustainable-business/esg-portal/integrated-reporting.html",
  },
  {
    name: "Stellantis",
    code: "stellantis",
    irUrl:
      "https://www.stellantis.com/en/investors/reporting/financial-reports",
  },
  {
    name: "Sanofi",
    code: "sanofi",
    irUrl:
      "https://www.sanofi.com/en/investors/financial-reports-and-regulated-information",
  },
];

async function checkServerStatus(): Promise<boolean> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/parse/status`, {
      timeout: 5000,
    });
    console.log("✅ Server is running and responsive");
    console.log(`   Service status: ${response.data.status}`);
    console.log(
      `   OpenAI API key: ${response.data.requirements.openai_api_key}`
    );
    return true;
  } catch (error) {
    console.error("❌ Server is not accessible:");
    console.error(
      `   Please make sure the backend server is running on ${API_BASE_URL}`
    );
    return false;
  }
}

async function testDownload(company: (typeof COMPANIES)[0]): Promise<void> {
  const response = await axios.post(
    `${API_BASE_URL}/api/annual_reports`,
    {
      companyName: company.code,
      irUrl: company.irUrl,
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 300000, // 5 minutes
    }
  );

  if (!response.data.success) {
    throw new Error(`Download failed: ${response.data.error}`);
  }

  console.log(
    `   Downloaded ${
      response.data.downloadedReports?.length || 0
    } files for years: ${response.data.years?.join(", ") || "unknown"}`
  );
}

async function testParse(company: (typeof COMPANIES)[0]): Promise<void> {
  const response = await axios.post(
    `${API_BASE_URL}/api/parse`,
    { company: company.code },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 600000, // 10 minutes
    }
  );

  if (!response.data.success) {
    throw new Error(`Parse failed: ${response.data.error}`);
  }

  const data = response.data.data;
  console.log(
    `   Parsed ${
      data.metadata.total_files
    } files covering years: ${data.metadata.years_covered.join(", ")}`
  );
  console.log(
    `   Statements: Income(${
      Object.keys(data.statements.income_statement).length
    }), Balance(${
      Object.keys(data.statements.balance_sheet).length
    }), CashFlow(${Object.keys(data.statements.cash_flow).length})`
  );
}

async function testCSV(company: (typeof COMPANIES)[0]): Promise<void> {
  // Test CSV download
  const response = await axios.get(
    `${API_BASE_URL}/api/csv/download/${company.code}`,
    { responseType: 'text', timeout: 30000 }
  );

  if (!response.data || response.data.length === 0) {
    throw new Error(`CSV download failed: Empty response`);
  }

  const lines = response.data.split('\n');
  if (lines.length < 2) {
    throw new Error(`CSV format invalid: Less than 2 lines`);
  }

  console.log(`   Generated CSV with ${lines.length} lines`);
  console.log(`   Headers: ${lines[0].substring(0, 50)}...`);
}

async function runAllTests() {
  console.log("🧪 Running Comprehensive API Tests");
  console.log("=".repeat(80));
  console.log(`🚀 API Base URL: ${API_BASE_URL}`);
  console.log("=".repeat(80));

  // Check server status first
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    process.exit(1);
  }

  const results: TestResults[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  console.log("\n📥 PHASE 1: Testing Download Endpoints");
  console.log("=".repeat(50));

  // Test download endpoints
  for (const company of COMPANIES) {
    const startTime = Date.now();
    try {
      console.log(`\n🔄 Testing ${company.name} download...`);
      await testDownload(company);
      const duration = Date.now() - startTime;
      results.push({
        endpoint: "download",
        company: company.name,
        success: true,
        duration,
      });
      totalPassed++;
      console.log(
        `✅ ${company.name} download test passed (${Math.round(
          duration / 1000
        )}s)`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      results.push({
        endpoint: "download",
        company: company.name,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      totalFailed++;
      console.log(
        `❌ ${company.name} download test failed (${Math.round(
          duration / 1000
        )}s)`
      );
      console.log(
        `   Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log("\n🔍 PHASE 2: Testing Parse Endpoints");
  console.log("=".repeat(50));

  // Test parse endpoints
  for (const company of COMPANIES) {
    const startTime = Date.now();
    try {
      console.log(`\n🔄 Testing ${company.name} parsing...`);
      await testParse(company);
      const duration = Date.now() - startTime;
      results.push({
        endpoint: "parse",
        company: company.name,
        success: true,
        duration,
      });
      totalPassed++;
      console.log(
        `✅ ${company.name} parse test passed (${Math.round(duration / 1000)}s)`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      results.push({
        endpoint: "parse",
        company: company.name,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      totalFailed++;
      console.log(
        `❌ ${company.name} parse test failed (${Math.round(duration / 1000)}s)`
      );
      console.log(
        `   Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log("\n📊 PHASE 3: Testing CSV Export Endpoints");
  console.log("=".repeat(50));

  // Test CSV endpoints
  for (const company of COMPANIES) {
    const startTime = Date.now();
    try {
      console.log(`\n🔄 Testing ${company.name} CSV export...`);
      await testCSV(company);
      const duration = Date.now() - startTime;
      results.push({
        endpoint: "csv",
        company: company.name,
        success: true,
        duration,
      });
      totalPassed++;
      console.log(
        `✅ ${company.name} CSV test passed (${Math.round(duration / 1000)}s)`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      results.push({
        endpoint: "csv",
        company: company.name,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      totalFailed++;
      console.log(
        `❌ ${company.name} CSV test failed (${Math.round(duration / 1000)}s)`
      );
      console.log(
        `   Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(80));

  console.log(`\n✅ Tests Passed: ${totalPassed}`);
  console.log(`❌ Tests Failed: ${totalFailed}`);
  console.log(`📊 Total Tests: ${totalPassed + totalFailed}`);
  console.log(
    `🎯 Success Rate: ${Math.round(
      (totalPassed / (totalPassed + totalFailed)) * 100
    )}%`
  );

  console.log("\n📋 Detailed Results:");
  results.forEach((result, index) => {
    const status = result.success ? "✅ PASS" : "❌ FAIL";
    const duration = Math.round(result.duration / 1000);
    console.log(
      `   ${index + 1}. ${status} | ${result.endpoint.toUpperCase()} | ${
        result.company
      } | ${duration}s`
    );
    if (result.error) {
      console.log(`      Error: ${result.error.substring(0, 100)}...`);
    }
  });

  // Test status endpoints
  console.log("\n🔍 Additional API Status Checks:");
  try {
    const statusResponse = await axios.get(`${API_BASE_URL}/api/parse/status`);
    console.log("✅ Parse status endpoint working");

    const companiesResponse = await axios.get(
      `${API_BASE_URL}/api/parse/companies`
    );
    console.log("✅ Companies listing endpoint working");
    console.log(
      `   Available companies: ${companiesResponse.data.total_available}`
    );
    console.log(
      `   Compiled companies: ${companiesResponse.data.total_compiled}`
    );

    // Test CSV companies endpoint
    const csvCompaniesResponse = await axios.get(`${API_BASE_URL}/api/csv/companies`);
    console.log("✅ CSV companies listing endpoint working");
    console.log(`   CSV-available companies: ${csvCompaniesResponse.data.total}`);

    // Test CSV comparative endpoint if multiple companies available
    if (csvCompaniesResponse.data.companies.length >= 2) {
      const testCompanies = csvCompaniesResponse.data.companies.slice(0, 2);
      const compareResponse = await axios.post(
        `${API_BASE_URL}/api/csv/compare`,
        { companies: testCompanies },
        { 
          responseType: 'text',
          headers: { "Content-Type": "application/json" },
          timeout: 30000
        }
      );
      if (compareResponse.data && compareResponse.data.length > 0) {
        console.log(`✅ CSV comparative export working (${testCompanies.join(", ")})`);
      }
    }

  } catch (error) {
    console.log("⚠️  Some status endpoints may not be working");
  }

  if (totalFailed > 0) {
    console.log(
      `\n❌ ${totalFailed} tests failed. Check the logs above for details.`
    );
    process.exit(1);
  } else {
    console.log("\n🎉 All tests passed successfully!");
  }
}

if (require.main === module) {
  runAllTests().catch((error) => {
    console.error("❌ Test runner failed:", error);
    process.exit(1);
  });
}
