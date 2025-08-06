#!/usr/bin/env ts-node

/**
 * Test script for downloading Novo Nordisk annual reports
 * Usage: npm run test:download:novonordisk
 */

import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: require("path").join(__dirname, "../../.env") });

const API_BASE_URL = process.env.API_URL || "http://localhost:5050";
const COMPANY_IR_URL =
  "https://www.novonordisk.com/sustainable-business/esg-portal/integrated-reporting.html";

async function testNovoNordiskDownload() {
  try {
    console.log("🧪 Testing Novo Nordisk Annual Report Download");
    console.log("=".repeat(60));
    console.log(`🌐 IR URL: ${COMPANY_IR_URL}`);
    console.log(`🚀 API Endpoint: ${API_BASE_URL}/api/annual_reports`);
    console.log("=".repeat(60));

    const startTime = Date.now();

    const response = await axios.post(
      `${API_BASE_URL}/api/annual_reports`,
      {
        companyName: "novonordisk",
        irUrl: COMPANY_IR_URL,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 300000, // 5 minutes timeout
      }
    );

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log("✅ SUCCESS! Download completed successfully");
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log("📊 Response summary:");
    console.log(`   Company: ${response.data.companyName}`);
    console.log(`   Files downloaded: ${response.data.totalFiles}`);
    console.log(`   Years: ${response.data.years?.join(", ") || "N/A"}`);

    if (response.data.downloadedFiles) {
      console.log("\n📁 Downloaded files:");
      response.data.downloadedFiles.forEach((file: string, index: number) => {
        console.log(`   ${index + 1}. ${file}`);
      });
    }

    console.log("\n🔗 Full response:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("❌ Download test failed:");

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
    } else {
      console.error("   Details:", error.message);
    }

    process.exit(1);
  }
}

if (require.main === module) {
  testNovoNordiskDownload();
}

export { testNovoNordiskDownload };
