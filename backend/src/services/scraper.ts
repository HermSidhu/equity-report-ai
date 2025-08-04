import axios from "axios";
import cheerio from "cheerio";
import puppeteer from "puppeteer";
import { downloadReports } from "./downloader";

const INCLUDE_KEYWORDS = /(annual|integrated)/i;
const EXCLUDE_KEYWORDS =
  /(tax|gri|tcfd|sasb|remuneration|interim|governance|sustainability|presentation)/i;

async function scrapeStatic(
  irUrl: string
): Promise<{ year: number; link: string }[]> {
  try {
    const { data } = await axios.get(irUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);
    const reports: { year: number; link: string }[] = [];

    $("a").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (!href || !href.toLowerCase().endsWith(".pdf")) return;

      const combined = `${text} ${href}`.toLowerCase();
      if (!INCLUDE_KEYWORDS.test(combined) || EXCLUDE_KEYWORDS.test(combined))
        return;

      const yearMatch = combined.match(/\b(20[0-9]{2})\b/);
      if (!yearMatch) return;
      const year = parseInt(yearMatch[1]);
      if (year >= 2014 && year <= 2024) {
        const absoluteLink = href.startsWith("http")
          ? href
          : new URL(href, irUrl).toString();
        reports.push({ year, link: absoluteLink });
      }
    });

    return reports.sort((a, b) => b.year - a.year).slice(0, 10);
  } catch {
    return [];
  }
}

async function scrapeWithPuppeteer(
  irUrl: string
): Promise<{ year: number; link: string }[]> {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
  const page = await browser.newPage();
  await page.goto(irUrl, { waitUntil: "networkidle2", timeout: 60000 });

  const reports: { year: number; link: string }[] = [];

  const yearLinks = await page.$$eval("a", (anchors) =>
    anchors
      .map((a) => a.getAttribute("href") || "")
      .filter((href) => /annual-report\/20[0-9]{2}/.test(href))
  );

  const uniqueYearLinks = Array.from(new Set(yearLinks));
  console.log(`📂 Found year links: ${uniqueYearLinks.length}`);

  for (const yLink of uniqueYearLinks) {
    const yearUrl = yLink.startsWith("http")
      ? yLink
      : new URL(yLink, irUrl).toString();
    const yearMatch = yearUrl.match(/\b(20[0-9]{2})\b/);
    if (!yearMatch) continue;
    const year = parseInt(yearMatch[1]);
    if (year < 2014 || year > 2024) continue;

    console.log(`➡ Navigating to ${yearUrl}`);
    await page.goto(yearUrl, { waitUntil: "networkidle2", timeout: 60000 });

    try {
      await page.waitForSelector('a[href$=".pdf"]', { timeout: 10000 });
    } catch {
      console.log(`⚠ No PDF links found for year ${year}`);
      continue;
    }

    const pdfLinks = await page.$$eval(
      "a",
      (anchors, y) =>
        anchors
          .map((a) => a.getAttribute("href") || "")
          .filter(
            (href) =>
              href.toLowerCase().endsWith(".pdf") && href.includes(y.toString())
          ),
      year
    );

    for (const pdfLink of pdfLinks) {
      const combined = pdfLink.toLowerCase();
      if (!INCLUDE_KEYWORDS.test(combined) || EXCLUDE_KEYWORDS.test(combined))
        continue;

      const absoluteLink = pdfLink.startsWith("http")
        ? pdfLink
        : new URL(pdfLink, yearUrl).toString();
      reports.push({ year, link: absoluteLink });
      console.log(`✅ Valid annual report for ${year}: ${absoluteLink}`);
    }
  }

  await browser.close();

  // Deduplicate by link
  const uniqueReports = Array.from(
    new Map(reports.map((r) => [r.link, r])).values()
  );
  return uniqueReports.sort((a, b) => b.year - a.year).slice(0, 10);
}

export async function scrapeAndDownloadAnnualReports(irUrl: string) {
  console.log(`🔍 Scraping annual reports for ${irUrl}`);

  let reports = await scrapeStatic(irUrl);

  if (!reports.length) {
    console.log(
      `⚠ No reports found using static scraping. Falling back to Puppeteer...`
    );
    reports = await scrapeWithPuppeteer(irUrl);
  }

  if (!reports.length)
    throw new Error("No annual reports found, even with Puppeteer");

  const companyCode = new URL(irUrl).hostname.replace(/\./g, "_");
  const files = await downloadReports(companyCode, reports);

  console.log(`✅ Downloaded ${files.length} reports for ${companyCode}`);
  return { count: files.length, files, years: reports.map((r) => r.year) };
}
