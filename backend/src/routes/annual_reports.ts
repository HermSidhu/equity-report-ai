import { Router } from "express";
import { scrapeAndDownloadReports } from "../services/reportProcessor";

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
      example: { companyName: "novonordisk", irUrl: "https://..." }
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

export default router;
