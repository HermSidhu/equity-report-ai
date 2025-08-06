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

  // Positive indicators for annual reports
  const annualKeywords = [
    "annual report",
    "integrated report",
    "form 20-f", // US SEC form for foreign companies
    "form 10-k", // US SEC form for domestic companies
    "årsrapport", // Danish
    "jahresbericht", // German
    "rapport annuel", // French
    "informe anual", // Spanish
    "annual report on form 20-f",
    "annual report on form 10-k",
  ];

  // Negative indicators to exclude (be more specific)
  const excludeKeywords = [
    "sustainability",
    "esg",
    "corporate responsibility",
    "tax strategy",
    "tax report",
    "interim",
    "quarterly",
    "half year",
    "half-year",
    "q1",
    "q2",
    "q3",
    "q4",
    "first quarter",
    "second quarter",
    "third quarter",
    "fourth quarter",
    "presentation",
    "investor day",
    "factsheet",
    "fact sheet",
    "notice",
    "proxy statement",
    "proxy",
    "governance",
    "compensation",
    "remuneration",
    "registration statement",
    "prospectus",
    "offering circular",
    "shelf registration",
    "earnings",
    "results announcement",
    "press release",
    "amendment",
    "form 8-k", // Current report (not annual)
    "form 10-q", // Quarterly report
    "form def 14a", // Proxy statement
    "form s-", // Registration statements
    "form f-", // Foreign issuer forms (except 20-F which can be annual)
    "form 6-k", // Report of foreign private issuer
    "current report",
    "material agreement",
    "insider trading",
    "dividend",
    "stock split",
    "merger",
    "acquisition",
    "corporate action",
    "warrant",
    "rights offering",
  ];

  // Special handling for Form 20-F and 10-K (these are annual reports)
  const isForm20F =
    lowerText.includes("form 20-f") || lowerText.includes("20-f");
  const isForm10K =
    lowerText.includes("form 10-k") || lowerText.includes("10-k");

  if (isForm20F || isForm10K) {
    // Make sure it's not an amendment or other variation
    const isAmendment =
      lowerText.includes("amendment") ||
      lowerText.includes("/a") ||
      lowerText.includes("form 20-f/a") ||
      lowerText.includes("form 10-k/a");
    return !isAmendment;
  }

  // Check for annual report keywords
  const hasAnnualKeyword = annualKeywords.some(
    (keyword) => lowerText.includes(keyword) || lowerHref.includes(keyword)
  );

  // Check for exclusion keywords
  const hasExcludeKeyword = excludeKeywords.some(
    (keyword) => lowerText.includes(keyword) || lowerHref.includes(keyword)
  );

  // If we find a year and "annual" but no exclusion keywords, it's likely an annual report
  const hasYear = /\b(20[0-9]{2})\b/.test(lowerText + " " + lowerHref);
  const hasAnnual =
    lowerText.includes("annual") || lowerHref.includes("annual");

  // More strict matching: require either specific annual keywords OR (year + annual)
  return (hasAnnualKeyword || (hasYear && hasAnnual)) && !hasExcludeKeyword;
}

/**
 * Try to extract direct PDF download URL from a viewer page
 */
async function extractDirectPdfUrl(
  page: any,
  viewerUrl: string
): Promise<string | null> {
  try {
    console.log(`🔍 Extracting direct PDF URL from viewer: ${viewerUrl}`);

    await page.goto(viewerUrl, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Look for direct PDF download links on the viewer page
    const directUrl = await page.evaluate(() => {
      // Strategy 1: Look for download buttons or links
      const downloadBtn = document.querySelector(
        'a[href*=".pdf"], button[onclick*=".pdf"], [download*=".pdf"]'
      );
      if (downloadBtn) {
        const href =
          (downloadBtn as HTMLAnchorElement).href ||
          downloadBtn
            .getAttribute("onclick")
            ?.match(/['"`](https?:\/\/[^'"`]+\.pdf[^'"`]*?)['"`]/)?.[1];
        if (href && href.includes(".pdf")) {
          return href;
        }
      }

      // Strategy 2: Look for PDF object/embed tags
      const pdfEmbed = document.querySelector(
        'object[data*=".pdf"], embed[src*=".pdf"], iframe[src*=".pdf"]'
      );
      if (pdfEmbed) {
        const src = (pdfEmbed as any).data || (pdfEmbed as any).src;
        if (src && src.includes(".pdf")) {
          return src;
        }
      }

      // Strategy 3: Look in page source for PDF URLs (common patterns for Funkton service)
      const pageContent = document.documentElement.innerHTML;

      // Look for direct download patterns
      const downloadPatterns = [
        /https?:\/\/[^"'\s]+\/download\/[^"'\s]+\.pdf/gi,
        /https?:\/\/[^"'\s]+\/file\/[^"'\s]+\.pdf/gi,
        /https?:\/\/[^"'\s]+\/pdf\/[^"'\s]+\.pdf/gi,
        /https?:\/\/[^"'\s]+\.pdf[^"'\s]*/gi,
      ];

      for (const pattern of downloadPatterns) {
        const matches = pageContent.match(pattern);
        if (matches) {
          for (const match of matches) {
            if (!match.includes("/view/") && match.includes(".pdf")) {
              return match.replace(/['"]/g, "");
            }
          }
        }
      }

      // Strategy 4: Look for Funkton-specific download endpoints
      const funktonPatterns = [
        /downloadFile\(['"`]([^'"`]+)['"`]\)/g,
        /download_url['":\s]*['"`]([^'"`]+\.pdf[^'"`]*?)['"`]/gi,
        /file_url['":\s]*['"`]([^'"`]+\.pdf[^'"`]*?)['"`]/gi,
      ];

      for (const pattern of funktonPatterns) {
        const matches = [...pageContent.matchAll(pattern)];
        for (const match of matches) {
          if (match[1] && match[1].includes(".pdf")) {
            let url = match[1];
            // Make relative URLs absolute
            if (url.startsWith("/")) {
              url = window.location.origin + url;
            } else if (!url.startsWith("http")) {
              url = window.location.origin + "/" + url;
            }
            return url;
          }
        }
      }

      // Strategy 5: Check for data attributes or hidden inputs
      const hiddenInputs = document.querySelectorAll(
        'input[type="hidden"], [data-url], [data-pdf-url], [data-download-url]'
      );
      for (const input of hiddenInputs) {
        const value =
          (input as HTMLInputElement).value ||
          input.getAttribute("data-url") ||
          input.getAttribute("data-pdf-url") ||
          input.getAttribute("data-download-url");
        if (value && value.includes(".pdf") && !value.includes("/view/")) {
          return value;
        }
      }

      // Strategy 6: Try to construct download URL from viewer URL
      const currentUrl = window.location.href;
      if (currentUrl.includes("/view/")) {
        // Try common download URL patterns
        const downloadUrls = [
          currentUrl.replace("/view/", "/download/"),
          currentUrl.replace("/view/", "/file/"),
          currentUrl.replace("/view/", "/pdf/"),
          currentUrl + "&download=1",
          currentUrl + "&format=pdf",
        ];

        // Return the first constructed URL (we'll validate it later)
        return downloadUrls[0];
      }

      return null;
    });

    if (directUrl) {
      console.log(`✅ Found direct PDF URL: ${directUrl}`);

      // Validate that the URL actually returns a PDF
      try {
        const response = await page.goto(directUrl, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });

        const contentType = response?.headers()["content-type"] || "";
        console.log(`📄 Validation - Content-Type: ${contentType}`);

        if (
          contentType.includes("pdf") ||
          contentType.includes("octet-stream") ||
          contentType.includes("binary")
        ) {
          console.log(`✅ Validated PDF URL: ${directUrl}`);
          return directUrl;
        } else {
          console.log(`❌ URL does not return PDF content: ${contentType}`);
        }
      } catch (validationError) {
        console.log(`⚠️  Could not validate URL:`, validationError);
        // Return the URL anyway, let the download function handle it
        return directUrl;
      }
    }

    console.log(`⚠️  No direct PDF URL found in viewer page`);
    return null;
  } catch (error) {
    console.log(`❌ Error extracting direct PDF URL:`, error);
    return null;
  }
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
    console.log(`📍 URL: ${url}`);

    // First, make a HEAD request to check the content type and handle redirects
    let finalUrl = url;
    try {
      const headResponse = await axios.head(url, {
        timeout: 30000,
        maxRedirects: 5,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/pdf,application/octet-stream,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      // Check if it's actually a PDF
      const contentType = headResponse.headers["content-type"] || "";
      console.log(`📄 Content-Type: ${contentType}`);

      if (
        !contentType.includes("pdf") &&
        !contentType.includes("octet-stream") &&
        !contentType.includes("binary")
      ) {
        console.log(`⚠️  Warning: Content type is not PDF: ${contentType}`);
      }

      // Update URL if there were redirects
      finalUrl = headResponse.request?.res?.responseUrl || url;
    } catch (headError) {
      console.log(`⚠️  HEAD request failed, proceeding with direct download`);
    }

    const response = await axios.get(finalUrl, {
      responseType: "stream",
      timeout: 120000,
      maxRedirects: 5,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/pdf,application/octet-stream,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: new URL(finalUrl).origin,
      },
    });

    // Check content type again
    const contentType = response.headers["content-type"] || "";
    const contentLength = response.headers["content-length"];
    console.log(
      `📊 Response - Content-Type: ${contentType}, Length: ${contentLength}`
    );

    if (
      !contentType.includes("pdf") &&
      !contentType.includes("octet-stream") &&
      !contentType.includes("binary")
    ) {
      console.log(`❌ Invalid content type for PDF: ${contentType}`);
      return false;
    }

    const writer = fs.createWriteStream(filePath);

    await new Promise<void>((resolve, reject) => {
      response.data.pipe(writer);
      writer.on("finish", () => {
        // Verify file size
        const stats = fs.statSync(filePath);
        console.log(`📏 Downloaded file size: ${stats.size} bytes`);

        if (stats.size < 1024) {
          // Less than 1KB is suspicious for a PDF
          console.log(
            `⚠️  Warning: File size is very small (${stats.size} bytes)`
          );
        }

        resolve();
      });
      writer.on("error", reject);
    });

    console.log(`✅ Downloaded: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to download ${url}:`, error);

    // Clean up partial file if it exists
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Cleaned up partial file: ${path.basename(filePath)}`);
      } catch (cleanupError) {
        console.error(`❌ Failed to clean up partial file:`, cleanupError);
      }
    }

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
  const downloadDir = path.join(
    __dirname,
    "../../storage/annual_reports",
    companyName
  );

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
    try {
      await page.goto(irUrl, {
        waitUntil: "networkidle2",
        timeout: 120000,
      });
      console.log(`✅ Successfully navigated to: ${irUrl}`);
    } catch (navError) {
      console.log(`⚠️  Navigation timeout, trying with domcontentloaded...`);
      try {
        // Fallback: try with less strict waiting condition
        await page.goto(irUrl, {
          waitUntil: "domcontentloaded",
          timeout: 90000,
        });
        console.log(`✅ Successfully navigated to: ${irUrl} (fallback)`);
      } catch (fallbackError) {
        console.error(`❌ Navigation failed completely:`, fallbackError);
        throw new Error(`Failed to navigate to ${irUrl}: ${fallbackError}`);
      }
    }

    // Wait a bit for any dynamic content to load
    console.log(`⏳ Waiting for dynamic content to load...`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log(`✅ Finished waiting for dynamic content`);

    try {
      // First, check for iframe sources that might contain PDF documents
      console.log("🔍 Checking for iframe content...");
      const iframeSources = await page.evaluate(() => {
        const iframes = Array.from(document.querySelectorAll("iframe[src]"));
        return iframes.map((iframe) => ({
          src: (iframe as HTMLIFrameElement).src,
          title: iframe.getAttribute("title") || "Embedded Content",
        }));
      });

      console.log(`🖼️  Found ${iframeSources.length} iframes`);

      let allPdfLinks: ReportLink[] = [];

      // If we find iframes, try to scrape them for PDF content
      for (const iframe of iframeSources) {
        let iframePage;
        try {
          console.log(`🔎 Checking iframe: ${iframe.src}`);

          // Create a new page for iframe content to avoid navigation issues
          iframePage = await browser.newPage();
          await iframePage.setViewport({ width: 1920, height: 1080 });
          await iframePage.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
          );

          // Navigate to iframe source with error handling
          try {
            await iframePage.goto(iframe.src, {
              waitUntil: "networkidle0",
              timeout: 90000,
            });
          } catch (iframeNavError) {
            console.log(
              `⚠️  Iframe navigation timeout, trying domcontentloaded...`
            );
            try {
              await iframePage.goto(iframe.src, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
              });
            } catch (iframeFallbackError) {
              console.log(`❌ Failed to load iframe: ${iframe.src}`);
              throw iframeFallbackError;
            }
          }

          // Wait longer for dynamic content to load
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // Try to trigger any lazy loading or click events
          await iframePage.evaluate(() => {
            // Scroll to trigger any lazy loading
            window.scrollTo(0, document.body.scrollHeight);

            // Try to click any expand/show buttons
            const expandButtons = document.querySelectorAll(
              'button, [role="button"], .expand, .show-more'
            );
            expandButtons.forEach((btn) => {
              try {
                (btn as HTMLElement).click();
              } catch (e) {
                // Ignore click errors
              }
            });
          });

          // Wait a bit more after potential interactions
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Collect PDF links from iframe
          const iframePdfLinks = await iframePage.evaluate(() => {
            const links: any[] = [];

            console.log("Starting PDF link collection in iframe...");
            console.log("Page URL:", window.location.href);
            console.log("Page title:", document.title);

            // Strategy 1: Look for direct PDF download links (not viewer links)
            const pdfAnchors = document.querySelectorAll(
              'a[href*=".pdf"], a[href*="PDF"], a[href*=".PDF"]'
            );

            console.log(`Found ${pdfAnchors.length} direct PDF links`);

            pdfAnchors.forEach((anchor, index) => {
              const href = (anchor as HTMLAnchorElement).href;
              const text = anchor.textContent?.trim() || "";

              console.log(`PDF Link ${index + 1}: "${text}" -> ${href}`);

              // Only add if it's a direct PDF link, not a viewer
              if (
                href &&
                text &&
                href.toLowerCase().includes(".pdf") &&
                !href.includes("/view/")
              ) {
                const isXHTML =
                  text.toLowerCase().includes("xhtml") ||
                  text.toLowerCase().includes("(xhtml)") ||
                  href.toLowerCase().includes("xhtml");

                if (!isXHTML) {
                  links.push({ text, href });
                  console.log(`Added direct PDF link: ${text}`);
                } else {
                  console.log(`Skipped XHTML version: ${text}`);
                }
              } else if (href.includes("/view/")) {
                console.log(`Found viewer link, will try to convert: ${text}`);
                // For now, still add viewer links but mark them for conversion
                const isXHTML =
                  text.toLowerCase().includes("xhtml") ||
                  text.toLowerCase().includes("(xhtml)");

                if (!isXHTML) {
                  links.push({ text, href });
                  console.log(`Added viewer link for conversion: ${text}`);
                }
              }
            });

            // Strategy 2: Look for download buttons or links with "download" attributes
            const downloadLinks = document.querySelectorAll(
              'a[download], a[href*="download"], button[onclick*="download"], a[title*="Download"], [href*="/file/"], [href*="/pdf/"]'
            );

            console.log(`Found ${downloadLinks.length} download links`);

            downloadLinks.forEach((element, index) => {
              const href =
                (element as HTMLAnchorElement).href ||
                element
                  .getAttribute("onclick")
                  ?.match(/['"`](https?:\/\/[^'"`]+\.pdf[^'"`]*?)['"`]/)?.[1] ||
                element.getAttribute("data-href") ||
                "";
              const text = element.textContent?.trim() || "";
              const download = element.getAttribute("download") || "";
              const title = element.getAttribute("title") || "";

              console.log(`Download Link ${index + 1}: "${text}" -> ${href}`);

              if (
                href &&
                (href.toLowerCase().includes(".pdf") ||
                  title.toLowerCase().includes("pdf") ||
                  text.toLowerCase().includes("pdf"))
              ) {
                const isXHTML = (text + download + title)
                  .toLowerCase()
                  .includes("xhtml");

                if (!isXHTML && !links.some((l) => l.href === href)) {
                  links.push({ text: text || title || "Download PDF", href });
                  console.log(`Added download link: ${text || title}`);
                }
              }
            });

            // Strategy 3: Look for any icon-based download links (PDF icons, download icons)
            const iconLinks = document.querySelectorAll(
              'a[title*="PDF"], a[title*="Download"], .pdf-icon, .download-icon, [class*="pdf"], [class*="download"]'
            );

            console.log(`Found ${iconLinks.length} icon-based links`);

            iconLinks.forEach((element, index) => {
              const href = (element as HTMLAnchorElement).href;
              const text = element.textContent?.trim() || "";
              const title = element.getAttribute("title") || "";
              const className = element.className || "";

              if (
                href &&
                href.toLowerCase().includes(".pdf") &&
                !href.includes("/view/")
              ) {
                const combinedText =
                  `${text} ${title} ${className}`.toLowerCase();
                const isXHTML = combinedText.includes("xhtml");

                if (!isXHTML && !links.some((l) => l.href === href)) {
                  links.push({ text: text || title || "PDF Document", href });
                  console.log(`Added icon link: ${text || title}`);
                }
              }
            });

            // Strategy 4: Look in the page source for direct PDF URLs
            const pageContent = document.documentElement.innerHTML;
            const pdfUrlMatches = pageContent.match(
              /https?:\/\/[^"'\s]+\.pdf[^"'\s]*/gi
            );

            if (pdfUrlMatches) {
              console.log(
                `Found ${pdfUrlMatches.length} PDF URLs in page source`
              );

              pdfUrlMatches.forEach((url, index) => {
                if (
                  !url.includes("/view/") &&
                  !links.some((l) => l.href === url)
                ) {
                  // Try to find associated text
                  const urlPattern = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  const contextMatch = pageContent.match(
                    new RegExp(`[^>]*${urlPattern}[^<]*`, "i")
                  );
                  const context = contextMatch
                    ? contextMatch[0].replace(/<[^>]*>/g, "").trim()
                    : "";

                  links.push({
                    text: context || `Annual Report PDF ${index + 1}`,
                    href: url,
                  });
                  console.log(`Added source PDF: ${context || url}`);
                }
              });
            }

            console.log(`Total PDF links found: ${links.length}`);
            return links;
          });

          console.log(`📋 Found ${iframePdfLinks.length} PDF links in iframe`);
          allPdfLinks.push(...iframePdfLinks);

          // Close the iframe page
          await iframePage.close();
        } catch (error) {
          console.log(`⚠️  Could not scrape iframe ${iframe.src}:`, error);

          // Make sure to close the iframe page even on error
          try {
            if (iframePage && !iframePage.isClosed()) {
              await iframePage.close();
            }
          } catch (closeError) {
            console.log(`⚠️  Error closing iframe page:`, closeError);
          }
        }
      }

      // If no iframe content found, scrape the main page
      if (allPdfLinks.length === 0) {
        console.log("🔎 Searching for PDF links on main page...");

        // Go back to main page
        await page.goto(irUrl, {
          waitUntil: "networkidle2",
          timeout: 120000,
        });

        await new Promise((resolve) => setTimeout(resolve, 3000));
        await new Promise((resolve) => setTimeout(resolve, 3000));

        allPdfLinks = await page.evaluate(() => {
          const links: ReportLink[] = [];

          // Strategy 1: Look for direct PDF links only
          const pdfAnchors = document.querySelectorAll(
            'a[href*=".pdf"], a[href*="PDF"], a[href*=".PDF"]'
          );

          pdfAnchors.forEach((anchor) => {
            const href = (anchor as HTMLAnchorElement).href;
            const text = anchor.textContent?.trim() || "";

            // Ensure it's actually a PDF and not XHTML
            if (href && text && href.toLowerCase().includes(".pdf")) {
              // Skip XHTML versions
              const isXHTML =
                text.toLowerCase().includes("xhtml") ||
                text.toLowerCase().includes("(xhtml)") ||
                href.toLowerCase().includes("xhtml");

              if (!isXHTML) {
                links.push({ text, href });
              }
            }
          });

          // Strategy 2: Look for links that might lead to PDFs (download buttons, etc.)
          const allLinks = document.querySelectorAll("a[href]");
          allLinks.forEach((anchor) => {
            const href = (anchor as HTMLAnchorElement).href;
            const text = anchor.textContent?.trim() || "";
            const ariaLabel = anchor.getAttribute("aria-label") || "";
            const title = anchor.getAttribute("title") || "";

            // Only process if it could be a PDF link
            const combinedText = `${text} ${ariaLabel} ${title}`.toLowerCase();
            const couldBePdf =
              href.toLowerCase().includes(".pdf") ||
              (combinedText.includes("download") &&
                combinedText.includes("pdf")) ||
              (combinedText.includes("annual report") &&
                !combinedText.includes("xhtml")) ||
              (combinedText.includes("integrated report") &&
                !combinedText.includes("xhtml"));

            const isXHTML =
              combinedText.includes("xhtml") ||
              combinedText.includes("(xhtml)") ||
              href.toLowerCase().includes("xhtml");

            if (
              href &&
              couldBePdf &&
              !isXHTML &&
              !links.some((l) => l.href === href)
            ) {
              links.push({ text: text || ariaLabel || title, href });
            }
          });

          // Strategy 3: Look for embedded PDFs or iframe sources (but exclude XHTML)
          const iframes = document.querySelectorAll(
            'iframe[src*=".pdf"], iframe[src*="PDF"]'
          );
          iframes.forEach((iframe) => {
            const src = (iframe as HTMLIFrameElement).src;
            if (src && !src.toLowerCase().includes("xhtml")) {
              const parentText =
                iframe.parentElement?.textContent?.trim() || "Embedded PDF";
              links.push({ text: parentText, href: src });
            }
          });

          return links;
        });
      }

      console.log(`📋 Found ${allPdfLinks.length} total PDF links`);

      // Debug: Show first few links found
      if (allPdfLinks.length > 0) {
        console.log("🔍 First few PDF links found:");
        allPdfLinks.slice(0, 5).forEach((link, i) => {
          console.log(`   ${i + 1}. "${link.text}" -> ${link.href}`);
        });
      } else {
        console.log("⚠️  No PDF links found. Checking page content...");
        // Let's see what's actually on the page
        const pageInfo = await page.evaluate(() => {
          const allLinks = Array.from(document.querySelectorAll("a[href]"))
            .map((a) => ({
              text: a.textContent?.trim() || "",
              href: (a as HTMLAnchorElement).href,
            }))
            .filter((l) => l.text && l.href);

          return {
            totalLinks: allLinks.length,
            sampleLinks: allLinks.slice(0, 10),
            pageTitle: document.title,
            hasDownloadText:
              document.body.textContent?.toLowerCase().includes("download") ||
              false,
          };
        });

        console.log(`📊 Page analysis:`, pageInfo);
      }

      // Filter and process links
      const validReports: (ReportLink & { year: number })[] = [];
      const currentYear = 2024;
      const targetYears = Array.from({ length: 10 }, (_, i) => currentYear - i); // 2024 down to 2015

      console.log(
        `🔍 Processing ${allPdfLinks.length} PDF links for validity...`
      );

      for (const link of allPdfLinks) {
        console.log(`📋 Checking link: "${link.text}" -> ${link.href}`);

        // Check if it's an annual report
        const isAnnual = isAnnualReport(link.text, link.href);
        console.log(`   📊 Is annual report: ${isAnnual}`);

        if (!isAnnual) {
          console.log(`   ❌ Skipped: Not an annual report`);
          continue;
        }

        // Extract year
        const year = extractYear(link.text, link.href);
        console.log(`   📅 Extracted year: ${year}`);

        if (!year || !targetYears.includes(year)) {
          console.log(
            `   ❌ Skipped: Invalid year (${year}), target years: ${targetYears
              .slice(0, 3)
              .join(", ")}...`
          );
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

        console.log(`   ✅ Added valid report for ${year}`);
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

          // Check if this is a viewer URL that needs to be converted to a direct download
          let downloadUrl = report.href;

          if (
            report.href.includes("/view/") ||
            report.href.includes("viewer") ||
            report.href.includes("ir-service.funkton.com")
          ) {
            console.log(
              `🔄 Converting viewer URL to direct download: ${report.href}`
            );

            // Create a new page for extracting the direct URL
            const extractorPage = await browser.newPage();
            try {
              const directUrl = await extractDirectPdfUrl(
                extractorPage,
                report.href
              );
              if (directUrl) {
                downloadUrl = directUrl;
                console.log(`✅ Converted to direct URL: ${downloadUrl}`);
              } else {
                console.log(
                  `⚠️  Could not find direct download URL, skipping ${report.year}`
                );
                continue;
              }
            } finally {
              await extractorPage.close();
            }
          }

          // Download the file
          const success = await downloadPdf(downloadUrl, filePath);
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
    } catch (mainError) {
      console.error(`❌ Error in main scraping logic:`, mainError);
      throw mainError;
    }
  } finally {
    console.log(`🔄 Closing browser...`);
    try {
      await browser.close();
      console.log(`✅ Browser closed successfully`);
    } catch (closeError) {
      console.error(`❌ Error closing browser:`, closeError);
    }
  }
}
