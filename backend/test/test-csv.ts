#!/usr/bin/env ts-node

/**
 * Test script for CSV export functionality
 * Usage: npm run test:csv
 */

import axios from "axios";
import fs from "fs";
import path from "path";

const API_BASE_URL = "http://localhost:5050";

async function testCSVFunctionality() {
  console.log("🧪 Testing CSV Export Functionality");
  console.log("=".repeat(60));
  console.log(`🚀 API Base URL: ${API_BASE_URL}`);
  console.log("=".repeat(60));

  try {
    // Test 1: List available companies
    console.log("\n📋 Test 1: List Available Companies");
    const companiesResponse = await axios.get(
      `${API_BASE_URL}/api/csv/companies`
    );
    console.log(
      `✅ Available companies: ${companiesResponse.data.companies.join(", ")}`
    );
    console.log(`📊 Total companies: ${companiesResponse.data.total}`);

    const companies = companiesResponse.data.companies;
    if (companies.length === 0) {
      console.log(
        "⚠️  No companies available for CSV export. Run parsing first."
      );
      return;
    }

    // Test 2: Preview CSV for first company
    console.log(`\n👀 Test 2: Preview CSV for ${companies[0]}`);
    const previewResponse = await axios.get(
      `${API_BASE_URL}/api/csv/preview/${companies[0]}?limit=5`
    );
    console.log(`✅ Preview generated successfully`);
    console.log(
      `📊 Headers: ${previewResponse.data.preview.headers.join(", ")}`
    );
    console.log(`📄 Total rows: ${previewResponse.data.preview.totalRows}`);
    console.log(`🔍 Preview rows: ${previewResponse.data.preview.previewRows}`);

    console.log("\n📋 Sample data:");
    previewResponse.data.preview.data
      .slice(0, 3)
      .forEach((row: any, index: number) => {
        console.log(`   Row ${index + 1}: ${row.Statement} - ${row.Item}`);
      });

    // Test 3: Download CSV for first company
    console.log(`\n📥 Test 3: Download CSV for ${companies[0]}`);
    const downloadResponse = await axios.get(
      `${API_BASE_URL}/api/csv/download/${companies[0]}`,
      { responseType: "text" }
    );

    console.log(`✅ CSV downloaded successfully`);
    console.log(
      `📏 Content length: ${downloadResponse.data.length} characters`
    );

    // Save to temporary file for inspection
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = path.join(tempDir, `${companies[0]}_test.csv`);
    fs.writeFileSync(tempFile, downloadResponse.data);
    console.log(`💾 Sample saved to: ${tempFile}`);

    // Show first few lines
    const lines = downloadResponse.data.split("\n");
    console.log(`📄 First 3 lines of CSV:`);
    lines.slice(0, 3).forEach((line: string, index: number) => {
      console.log(`   ${index + 1}: ${line.substring(0, 80)}...`);
    });

    // Test 4: Comparative CSV (if multiple companies available)
    if (companies.length > 1) {
      console.log(`\n🔄 Test 4: Comparative CSV for multiple companies`);
      const compareCompanies = companies.slice(
        0,
        Math.min(3, companies.length)
      );

      const compareResponse = await axios.post(
        `${API_BASE_URL}/api/csv/compare`,
        { companies: compareCompanies },
        {
          responseType: "text",
          headers: { "Content-Type": "application/json" },
        }
      );

      console.log(`✅ Comparative CSV generated successfully`);
      console.log(`👥 Companies: ${compareCompanies.join(", ")}`);
      console.log(
        `📏 Content length: ${compareResponse.data.length} characters`
      );

      // Save comparative CSV
      const compareFile = path.join(
        tempDir,
        `comparison_${compareCompanies.join("_")}_test.csv`
      );
      fs.writeFileSync(compareFile, compareResponse.data);
      console.log(`💾 Comparative CSV saved to: ${compareFile}`);

      // Show first few lines
      const compareLines = compareResponse.data.split("\n");
      console.log(`📄 First 3 lines of comparative CSV:`);
      compareLines.slice(0, 3).forEach((line: string, index: number) => {
        console.log(`   ${index + 1}: ${line.substring(0, 80)}...`);
      });
    } else {
      console.log(
        `\n⚠️  Test 4 skipped: Only one company available for comparison`
      );
    }

    // Test 5: Error handling
    console.log(`\n❌ Test 5: Error Handling`);
    try {
      await axios.get(`${API_BASE_URL}/api/csv/download/nonexistent_company`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`✅ Error handling works: ${error.response.data.error}`);
      } else {
        console.log(`⚠️  Unexpected error: ${error.message}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 All CSV tests completed successfully!");
    console.log(`📁 Test files saved in: ${tempDir}`);
    console.log("=".repeat(60));
  } catch (error: any) {
    console.error("\n❌ CSV Test Failed!");
    console.error("=".repeat(60));

    if (error.response) {
      console.error(`📊 Status: ${error.response.status}`);
      console.error(
        `📝 Error: ${error.response.data?.error || error.response.statusText}`
      );
      if (error.response.data?.details) {
        console.error(`🔍 Details: ${error.response.data.details}`);
      }
    } else if (error.request) {
      console.error("🌐 Network Error: No response received");
      console.error(
        "🔍 Check if the backend server is running on",
        API_BASE_URL
      );
    } else {
      console.error(`⚠️  Error: ${error.message}`);
    }

    console.error("=".repeat(60));
    process.exit(1);
  }
}

if (require.main === module) {
  testCSVFunctionality();
}

export { testCSVFunctionality };
