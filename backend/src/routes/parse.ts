import { Router } from "express";
import { parseFinancialStatements } from "../services/parser";
import { ParsedFinancialStatements } from "../types/financial";

const router = Router();

/**
 * POST /api/parse
 * Request body: { company: string }
 * Parses financial statements from downloaded PDFs
 */
router.post("/", async (req, res) => {
  const { company } = req.body;

  if (!company) {
    return res.status(400).json({
      error: "Missing company parameter in request body",
      example: { company: "novonordisk" },
    });
  }

  if (typeof company !== "string" || !/^[a-zA-Z0-9_-]+$/.test(company)) {
    return res.status(400).json({
      error:
        "Invalid company code. Use alphanumeric characters, hyphens, and underscores only.",
      example: { company: "novo-nordisk" },
    });
  }

  try {
    console.log(`🚀 Starting financial statement parsing for: ${company}`);

    const result: ParsedFinancialStatements = await parseFinancialStatements(
      company
    );

    res.json({
      success: true,
      message: "Financial statements parsed successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("❌ Parsing failed:", error);

    // Handle specific error types
    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Company reports not found",
        details: error.message,
        suggestion:
          "Make sure you have downloaded annual reports for this company first using /api/annual_reports",
      });
    }

    if (error.message.includes("No PDF files found")) {
      return res.status(404).json({
        success: false,
        error: "No PDF files found for company",
        details: error.message,
        suggestion:
          "Download annual reports first using /api/annual_reports",
      });
    }

    if (error.message.includes("Failed to parse any PDF files")) {
      return res.status(422).json({
        success: false,
        error: "Unable to parse any PDF files",
        details: error.message,
        suggestion:
          "Check if PDFs are valid and contain financial statements. AI parsing may have failed.",
      });
    }

    if (error.code === "ENOENT") {
      return res.status(404).json({
        success: false,
        error: "Annual reports directory not found",
        details: `No reports found for company: ${company}`,
        suggestion:
          "Download annual reports first using /api/annual_reports",
      });
    }

    // OpenAI API errors
    if (error.status === 401) {
      return res.status(500).json({
        success: false,
        error: "AI service authentication failed",
        details: "Invalid OpenAI API key",
        suggestion: "Check your OPENAI_API_KEY environment variable",
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: "AI service rate limit exceeded",
        details: "Too many requests to OpenAI API",
        suggestion: "Wait a few minutes and try again",
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      error: "Failed to parse financial statements",
      details: error.message,
    });
  }
});

/**
 * GET /api/parse/status
 * Check if parsing service is available
 */
router.get("/status", (req, res) => {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  res.json({
    success: true,
    service: "Financial Statement Parser",
    status: hasOpenAIKey ? "ready" : "misconfigured",
    ai_provider: "OpenAI",
    model: "gpt-4o",
    requirements: {
      openai_api_key: hasOpenAIKey ? "configured" : "missing",
    },
    supported_formats: ["PDF"],
    supported_statements: [
      "Income Statement",
      "Balance Sheet",
      "Cash Flow Statement",
    ],
  });
});

/**
 * GET /api/parse/companies
 * List companies that have been parsed or can be parsed
 */
router.get("/companies", (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");

    const reportsDir = path.join(__dirname, "../../storage/annual_reports");
    const parsedDataDir = path.join(__dirname, "../../storage/parsed_data");
    const compiledDataDir = path.join(__dirname, "../../storage/compiled_data");

    let availableCompanies: string[] = [];
    let parsedCompanies: string[] = [];
    let compiledCompanies: string[] = [];

    // Check for downloaded reports
    if (fs.existsSync(reportsDir)) {
      availableCompanies = fs
        .readdirSync(reportsDir, { withFileTypes: true })
        .filter((dirent: any) => dirent.isDirectory())
        .map((dirent: any) => dirent.name);
    }

    // Check for parsed raw data
    if (fs.existsSync(parsedDataDir)) {
      parsedCompanies = fs
        .readdirSync(parsedDataDir, { withFileTypes: true })
        .filter((dirent: any) => dirent.isDirectory())
        .map((dirent: any) => dirent.name);
    }

    // Check for compiled results
    if (fs.existsSync(compiledDataDir)) {
      const compiledFiles = fs
        .readdirSync(compiledDataDir)
        .filter((file: string) => file.endsWith(".json"))
        .map((file: string) => file.replace(".json", ""));
      compiledCompanies = compiledFiles;
    }

    res.json({
      success: true,
      companies: {
        available_for_parsing: availableCompanies,
        raw_data_parsed: parsedCompanies,
        compiled_data_ready: compiledCompanies,
      },
      total_available: availableCompanies.length,
      total_parsed: parsedCompanies.length,
      total_compiled: compiledCompanies.length,
      directory_structure: {
        annual_reports: "Raw downloaded PDFs organized by company",
        parsed_data: "AI-extracted JSON data from each PDF (by year)",
        compiled_data: "Normalized 10-year consolidated financials",
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to list companies",
      details: error.message,
    });
  }
});

export default router;
