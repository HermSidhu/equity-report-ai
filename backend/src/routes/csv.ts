import { Router } from "express";
import { CSVExporter } from "../services/csvExporter";

const router = Router();

/**
 * GET /api/csv/companies
 * List all available companies for CSV export
 */
router.get("/companies", (req, res) => {
  try {
    const companies = CSVExporter.getAvailableCompanies();
    
    res.json({
      success: true,
      companies,
      total: companies.length,
      message: "Available companies for CSV export"
    });
  } catch (error: any) {
    console.error("❌ Error listing companies:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list companies",
      details: error.message
    });
  }
});

/**
 * GET /api/csv/download/:company
 * Download CSV file for a specific company
 */
router.get("/download/:company", (req, res) => {
  const { company } = req.params;
  
  if (!company) {
    return res.status(400).json({
      error: "Company parameter is required",
      example: "/api/csv/download/novonordisk"
    });
  }
  
  try {
    console.log(`📊 Generating CSV for company: ${company}`);
    
    const csvContent = CSVExporter.generateCompanyCSV(company);
    const filename = `${company}_financial_data.csv`;
    
    // Set headers for file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache");
    
    console.log(`✅ CSV generated successfully for ${company}`);
    res.send(csvContent);
    
  } catch (error: any) {
    if (error.message.includes("No compiled data found")) {
      // This is expected for non-existent companies - log as info, not error
      console.log(`ℹ️  CSV request for non-existent company: ${company}`);
      return res.status(404).json({
        success: false,
        error: "Company data not found",
        details: error.message,
        suggestion: `Try downloading and parsing reports for ${company} first`
      });
    }
    
    // Log actual server errors
    console.error(`❌ CSV generation failed for ${company}:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to generate CSV",
      details: error.message
    });
  }
});

/**
 * POST /api/csv/compare
 * Generate comparative CSV for multiple companies
 * Request body: { companies: string[] }
 */
router.post("/compare", (req, res) => {
  const { companies } = req.body;
  
  if (!companies || !Array.isArray(companies) || companies.length === 0) {
    return res.status(400).json({
      error: "Companies array is required",
      example: { companies: ["novonordisk", "stellantis"] }
    });
  }
  
  if (companies.length > 10) {
    return res.status(400).json({
      error: "Too many companies requested. Maximum 10 companies allowed.",
      provided: companies.length
    });
  }
  
  try {
    console.log(`📊 Generating comparative CSV for: ${companies.join(", ")}`);
    
    const csvContent = CSVExporter.generateComparativeCSV(companies);
    const filename = `financial_comparison_${companies.join("_")}.csv`;
    
    // Set headers for file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache");
    
    console.log(`✅ Comparative CSV generated successfully for ${companies.length} companies`);
    res.send(csvContent);
    
  } catch (error: any) {
    if (error.message.includes("No compiled data found")) {
      console.log(`ℹ️  Comparative CSV request for companies with missing data: ${companies.join(", ")}`);
      return res.status(404).json({
        success: false,
        error: "No data found for the specified companies",
        details: error.message,
        suggestion: "Make sure the companies have been processed and compiled"
      });
    }
    
    // Log actual server errors
    console.error("❌ Comparative CSV generation failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate comparative CSV",
      details: error.message
    });
  }
});

/**
 * GET /api/csv/preview/:company
 * Preview CSV structure without downloading (returns JSON)
 */
router.get("/preview/:company", (req, res) => {
  const { company } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  
  if (!company) {
    return res.status(400).json({
      error: "Company parameter is required"
    });
  }
  
  try {
    console.log(`👀 Generating CSV preview for: ${company}`);
    
    const csvContent = CSVExporter.generateCompanyCSV(company);
    const lines = csvContent.split("\n");
    const headers = lines[0].split(",");
    
    // Parse limited number of data rows
    const dataRows = lines
      .slice(1, limit + 1)
      .map(line => {
        const values = line.split(",");
        const row: { [key: string]: string } = {};
        headers.forEach((header, index) => {
          row[header.replace(/"/g, "")] = values[index]?.replace(/"/g, "") || "";
        });
        return row;
      })
      .filter(row => Object.values(row).some(val => val !== ""));
    
    res.json({
      success: true,
      preview: {
        company,
        headers: headers.map(h => h.replace(/"/g, "")),
        totalRows: lines.length - 1,
        previewRows: dataRows.length,
        data: dataRows
      },
      message: `CSV preview for ${company} (showing first ${dataRows.length} rows)`
    });
    
  } catch (error: any) {
    if (error.message.includes("No compiled data found")) {
      console.log(`ℹ️  CSV preview request for non-existent company: ${company}`);
      return res.status(404).json({
        success: false,
        error: "Company data not found",
        details: error.message
      });
    }
    
    // Log actual server errors
    console.error(`❌ CSV preview failed for ${company}:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to generate CSV preview",
      details: error.message
    });
  }
});

export default router;
