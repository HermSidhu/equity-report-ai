import { Router } from "express";
import { scrapeAndDownloadReports } from "../services/reportProcessor";
import fs from "fs";
import path from "path";

const router = Router();

/**
 * POST /api/annual_reports
 * Request body: { companyName: string, irUrl: string }
 * Scrapes and downloads annual reports for the last 10 years (max)
 */
router.post("/", async (req, res) => {
  const { companyName, irUrl } = req.body;

  if (!companyName || !irUrl) {
    return res.status(400).json({
      error: "Missing companyName or irUrl in request body",
      example: { companyName: "novonordisk", irUrl: "https://..." },
    });
  }

  if (!irUrl.startsWith("http")) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  try {
    console.log(`🚀 Starting report download for: ${companyName} - ${irUrl}`);

    const result = await scrapeAndDownloadReports(irUrl);

    res.json({
      success: true,
      message: "Annual reports downloaded successfully",
      ...result,
    });
  } catch (error: any) {
    console.error("❌ Download failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download reports",
      details: error.message,
    });
  }
});

/**
 * GET /api/annual_reports/:companyId/files
 * List downloaded PDF files for a specific company
 */
router.get("/:companyId/files", (req, res) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({
      error: "Missing companyId parameter",
    });
  }

  try {
    const companyDir = path.join(
      __dirname,
      "../../storage/annual_reports",
      companyId
    );

    if (!fs.existsSync(companyDir)) {
      return res.json({
        companyId,
        files: [],
        message: "No reports downloaded yet for this company",
      });
    }

    const files = fs
      .readdirSync(companyDir)
      .filter((file) => file.toLowerCase().endsWith(".pdf"))
      .map((filename) => {
        const filePath = path.join(companyDir, filename);
        const stats = fs.statSync(filePath);
        const year = filename.match(/(\d{4})/)?.[1];

        return {
          filename,
          path: path.relative(process.cwd(), filePath),
          year: year ? parseInt(year) : null,
          size: stats.size,
          downloadedAt: stats.mtime,
        };
      })
      .sort((a, b) => (b.year || 0) - (a.year || 0)); // Sort by year, newest first

    res.json({
      companyId,
      files,
      totalFiles: files.length,
    });
  } catch (error: any) {
    console.error("❌ Error listing files:", error);
    res.status(500).json({
      error: "Failed to list downloaded files",
      details: error.message,
    });
  }
});

export default router;
