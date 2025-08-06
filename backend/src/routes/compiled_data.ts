import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

/**
 * GET /api/compiled_data/:companyId
 * Get compiled financial data for a specific company
 */
router.get("/:companyId", (req, res) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({
      success: false,
      error: "Company ID parameter is required",
      example: "/api/compiled_data/novonordisk",
    });
  }

  try {
    const compiledDataDir = path.join(__dirname, "../../storage/compiled_data");
    const filePath = path.join(compiledDataDir, `${companyId}.json`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Compiled data not found for this company",
        details: `No compiled data file found at ${filePath}`,
        available: fs.existsSync(compiledDataDir)
          ? fs
              .readdirSync(compiledDataDir)
              .filter((f) => f.endsWith(".json"))
              .map((f) => f.replace(".json", ""))
          : [],
      });
    }

    // Read and parse the JSON file
    const fileContent = fs.readFileSync(filePath, "utf8");
    const compiledData = JSON.parse(fileContent);

    console.log(`📊 Serving compiled data for company: ${companyId}`);

    res.json({
      success: true,
      data: compiledData,
      message: `Compiled financial data for ${companyId}`,
    });
  } catch (error: any) {
    console.error(`❌ Error reading compiled data for ${companyId}:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to read compiled data",
      details: error.message,
    });
  }
});

/**
 * GET /api/compiled_data
 * List all available companies with compiled data
 */
router.get("/", (req, res) => {
  try {
    const compiledDataDir = path.join(__dirname, "../../storage/compiled_data");

    if (!fs.existsSync(compiledDataDir)) {
      return res.json({
        success: true,
        companies: [],
        total: 0,
        message: "No compiled data directory found",
      });
    }

    const files = fs.readdirSync(compiledDataDir);
    const companies = files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""));

    res.json({
      success: true,
      companies,
      total: companies.length,
      message: "Available companies with compiled data",
    });
  } catch (error: any) {
    console.error("❌ Error listing compiled data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list compiled data",
      details: error.message,
    });
  }
});

export default router;
