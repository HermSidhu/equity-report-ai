import { Router } from "express";
import { scrapeAndDownloadAnnualReports } from "../services/scraper";

const router = Router();

router.post("/annual_report", async (req, res) => {
  const { ir_url } = req.body;
  if (!ir_url) {
    return res.status(400).json({ error: "Missing ir_url in request body" });
  }

  try {
    const result = await scrapeAndDownloadAnnualReports(ir_url);
    res.json({
      message: `Downloaded ${result.count} annual reports`,
      reports: result.files,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Failed to scrape and download reports",
      details: error.message,
    });
  }
});

export default router;
