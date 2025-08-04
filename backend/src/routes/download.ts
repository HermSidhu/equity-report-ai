import { Router } from "express";
import { scrapeAndDownloadReports } from "../services/reportProcessor";

const router = Router();

/**
 * POST /api/download/annual_report
 * Request body: { ir_url: string }
 * Scrapes and downloads annual reports for the last 10 years (max)
 */
router.post("/annual_report", async (req, res) => {
  const { ir_url } = req.body;

  if (!ir_url) {
    return res.status(400).json({ error: "Missing ir_url in request body" });
  }

  if (!ir_url.startsWith("http")) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  try {
    console.log(`🚀 Starting report download for: ${ir_url}`);

    const result = await scrapeAndDownloadReports(ir_url);

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
