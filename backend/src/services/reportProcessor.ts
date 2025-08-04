import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import axios from "axios";

interface ReportLink {
  text: string;
  href: string;
  year?: number;
}

interface DownloadResult {
  companyName: string;
  downloadedFiles: string[];
  years: number[];
  totalFiles: number;
}

/**
 * Extract company name from URL for folder naming
 */
function extractCompanyName(url: string): string {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return domain.split(".")[0];
  } catch {
    return "unknown_company";
  }
}

/**
 * Check if text indicates this is an annual report (not sustainability, tax, etc.)
 */
function isAnnualReport(text: string, href: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerHref = href.toLowerCase();

  // Positive indicators
  const annualKeywords = [
    "annual report",
    "integrated report",
    "form 10-k",
    "årsrapport", // Danish
    "jahresbericht", // German
    "rapport annuel", // French
    "informe anual", // Spanish
  ];

  // Negative indicators to exclude
  const excludeKeywords = [
    "sustainability",
    "esg",
    "corporate responsibility",
    "tax",
    "interim",
    "quarterly",
    "q1",
    "q2",
    "q3",
    "q4",
    "presentation",
    "investor day",
    "factsheet",
    "notice",
  ];

  // Check if it contains annual report indicators
  const hasAnnualKeyword = annualKeywords.some(
    (keyword) => lowerText.includes(keyword) || lowerHref.includes(keyword)
  );

  // Check if it contains exclusion keywords
  const hasExcludeKeyword = excludeKeywords.some(
    (keyword) => lowerText.includes(keyword) || lowerHref.includes(keyword)
  );

  return hasAnnualKeyword && !hasExcludeKeyword;
}

/**
 * Extract year from text or URL
 */
function extractYear(text: string, href: string): number | null {
  const combined = `${text} ${href}`;
  const yearMatch = combined.match(/\b(20[0-9]{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    // Only accept years from 2014 to 2024
    if (year >= 2014 && year <= 2024) {
      return year;
    }
  }
  return null;
}

/**
 * Download a single PDF file
 */
async function downloadPdf(url: string, filePath: string): Promise<boolean> {
  try {
    console.log(`⬇️  Downloading: ${path.basename(filePath)}`);

    const response = await axios.get(url, {
      responseType: "stream",
      timeout: 60000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    const writer = fs.createWriteStream(filePath);

    await new Promise<void>((resolve, reject) => {
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(`✅ Downloaded: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to download ${url}:`, error);
    return false;
  }
}

/**
 * Main function to scrape and download annual reports
 */
export async function scrapeAndDownloadReports(
  irUrl: string
): Promise<DownloadResult> {
  console.log(`🔍 Scraping reports from: ${irUrl}`);

  const companyName = extractCompanyName(irUrl);
  const downloadDir = path.join(__dirname, "../../annual_reports", companyName);

  // Create download directory
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
    console.log(`📁 Created directory: ${downloadDir}`);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-web-security",
    ],
  });

  try {
    const page = await browser.newPage();

    // Set a reasonable viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    console.log(`🌐 Navigating to: ${irUrl}`);
    await page.goto(irUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Wait a bit for any dynamic content to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Collect all PDF links on the page
    console.log("🔎 Searching for PDF links...");
    const pdfLinks = await page.evaluate(() => {
      const links: ReportLink[] = [];
      const anchors = document.querySelectorAll(
        'a[href*=".pdf"], a[href*="PDF"]'
      );

      anchors.forEach((anchor) => {
        const href = (anchor as HTMLAnchorElement).href;
        const text = anchor.textContent?.trim() || "";

        if (href && text) {
          links.push({ text, href });
        }
      });

      return links;
    });

    console.log(`📋 Found ${pdfLinks.length} PDF links`);

    // Filter and process links
    const validReports: (ReportLink & { year: number })[] = [];
    const currentYear = 2024;
    const targetYears = Array.from({ length: 10 }, (_, i) => currentYear - i); // 2024 down to 2015

    for (const link of pdfLinks) {
      // Check if it's an annual report
      if (!isAnnualReport(link.text, link.href)) {
        continue;
      }

      // Extract year
      const year = extractYear(link.text, link.href);
      if (!year || !targetYears.includes(year)) {
        continue;
      }

      // Check if we already have a report for this year
      const existingReport = validReports.find((r) => r.year === year);
      if (existingReport) {
        console.log(
          `⚠️  Multiple reports found for ${year}, keeping first one`
        );
        continue;
      }

      validReports.push({ ...link, year });
    }

    // Sort by year (newest first)
    validReports.sort((a, b) => b.year - a.year);

    console.log(`✅ Found ${validReports.length} valid annual reports:`);
    validReports.forEach((report) => {
      console.log(`   📄 ${report.year}: ${report.text}`);
    });

    // Download the reports
    const downloadedFiles: string[] = [];
    const downloadedYears: number[] = [];

    for (const report of validReports) {
      try {
        // Create a clean filename
        const urlParts = new URL(report.href);
        const originalName = path.basename(urlParts.pathname);
        const extension = path.extname(originalName) || ".pdf";
        const cleanName = `${report.year}-annual-report${extension}`;
        const filePath = path.join(downloadDir, cleanName);

        // Skip if file already exists
        if (fs.existsSync(filePath)) {
          console.log(`⏭️  Skipping ${cleanName} (already exists)`);
          downloadedFiles.push(filePath);
          downloadedYears.push(report.year);
          continue;
        }

        // Download the file
        const success = await downloadPdf(report.href, filePath);
        if (success) {
          downloadedFiles.push(filePath);
          downloadedYears.push(report.year);
        }
      } catch (error) {
        console.error(`❌ Error processing ${report.year} report:`, error);
      }
    }

    console.log(
      `🎉 Download completed! ${downloadedFiles.length} files downloaded.`
    );

    return {
      companyName,
      downloadedFiles: downloadedFiles.map((f) =>
        path.relative(process.cwd(), f)
      ),
      years: downloadedYears.sort((a, b) => b - a),
      totalFiles: downloadedFiles.length,
    };
  } finally {
    await browser.close();
  }
}
