import axios from "axios";
import cheerio from "cheerio";
import puppeteer from "puppeteer";
import { downloadReports } from "./downloader";

const INCLUDE_KEYWORDS =
  /(annual report|integrated report|consolidated financial statements)/i;
const EXCLUDE_KEYWORDS =
  /(sustainability|esg|csr|presentation|quarter|q[1-4]|half-year|interim)/i;

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

      const fullText = `${text} ${href}`.toLowerCase();
      if (INCLUDE_KEYWORDS.test(fullText) && !EXCLUDE_KEYWORDS.test(fullText)) {
        const yearMatch = fullText.match(/\b(20[0-9]{2})\b/);
        if (!yearMatch) return;
        const year = parseInt(yearMatch[1]);
        if (year > 2013 && year <= 2024) {
          const absoluteLink = href.startsWith("http")
            ? href
            : new URL(href, irUrl).toString();
          reports.push({ year, link: absoluteLink });
        }
      }
    });

    return reports.sort((a, b) => b.year - a.year).slice(0, 10);
  } catch (err) {
    console.log(
      `⚠ Static scrape failed for ${irUrl}, error: ${(err as Error).message}`
    );
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

  let reports: { year: number; link: string }[] = [];

  // Step 1: Look for any direct PDF links on the main page
  const directLinks = await page.$$eval("a", (anchors) =>
    anchors
      .map((a) => ({
        href: a.getAttribute("href") || "",
        text: a.textContent?.trim() || "",
      }))
      .filter(
        (link) =>
          link.href.toLowerCase().endsWith(".pdf") &&
          /(annual|report)/i.test(`${link.text} ${link.href}`)
      )
  );

  for (const { href, text } of directLinks) {
    const yearMatch = `${text} ${href}`.match(/\b(20[0-9]{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      if (year >= 2014 && year <= 2024) {
        const absoluteLink = href.startsWith("http")
          ? href
          : new URL(href, irUrl).toString();
        reports.push({ year, link: absoluteLink });
      }
    }
  }

  // Step 2: If too few found, look for year-based navigation links
  if (reports.length < 2) {
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

      await page.goto(yearUrl, { waitUntil: "networkidle2", timeout: 60000 });

      // Scrape for PDF links in the rendered DOM
      const pdfLink = await page.$$eval("a", (anchors) => {
        const link = anchors.find((a) => {
          const href = a.getAttribute("href") || "";
          return (
            href.toLowerCase().endsWith(".pdf") &&
            href.toLowerCase().includes("annual")
          );
        });
        return link ? link.getAttribute("href") : null;
      });

      if (pdfLink) {
        const absoluteLink = pdfLink.startsWith("http")
          ? pdfLink
          : new URL(pdfLink, yearUrl).toString();
        reports.push({ year, link: absoluteLink });
        console.log(`✅ Found PDF for year ${year}: ${absoluteLink}`);
      } else {
        console.log(`⚠ No PDF link found for year ${year} on ${yearUrl}`);
      }
    }
  }

  await browser.close();
  return reports.sort((a, b) => b.year - a.year).slice(0, 10);
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
