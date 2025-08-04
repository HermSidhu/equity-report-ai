#!/usr/bin/env ts-node

/*    console.log(`🧪     const fullPath = path.resolve(__dirname, "../../", pdfFile);
    console.log(`🔍 Debug: __dirname = ${__dirname}`);
    console.log(`🔍 Debug: fullPath = ${fullPath}`);
    console.log(`🔍 Debug: path exists = ${require('fs').existsSync(fullPath)}`);
    const result = await parsePDFWithAI(fullPath, year);  const fullPath = path.join(__dirname, "../../", pdfFile);esting single PDF parsing...`);
    console.log(`📄 File: ${pdfFile}`);
    console.log(`📅 Year: ${year}`);
    console.log(`🏠 __dirname: ${__dirname}`);
    
    const fullPath = path.resolve(__dirname, '../../', pdfFile);
    console.log(`📍 Full path: ${fullPath}`);
    
    // Check if file exists
    if (!require('fs').existsSync(fullPath)) {
      console.log(`❌ File does not exist: ${fullPath}`);
      process.exit(1);
    }
    
    console.log('=' .repeat(60));

    const result = await parsePDFWithAI(fullPath, year);   const fullPath = path.resolve(__dirname, '../../', pdfFile);est script to parse a single PDF file with improved prompt
 */

import { parsePDFWithAI } from "../services/parser";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config();

async function testSinglePDF() {
  const pdfFile = process.argv[2];
  const year = parseInt(process.argv[3]);

  if (!pdfFile || !year) {
    console.log("Usage: npm run test:single-pdf -- <pdf_file> <year>");
    console.log(
      "Example: npm run test:single-pdf -- annual_reports/novonordisk/2019-annual-report.pdf 2019"
    );
    process.exit(1);
  }

  try {
    console.log(`🧪 Testing single PDF parsing...`);
    console.log(`📄 File: ${pdfFile}`);
    console.log(`📅 Year: ${year}`);
    console.log("=".repeat(60));

    const fullPath = path.resolve(__dirname, "../../", pdfFile);
    const result = await parsePDFWithAI(fullPath, year);

    if (result) {
      console.log("✅ SUCCESS! Parsed data:");
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("❌ Failed to parse PDF");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

if (require.main === module) {
  testSinglePDF();
}
