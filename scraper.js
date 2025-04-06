import puppeteer from "puppeteer-core";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";
import path from "path";
import fs from "fs";

puppeteer.use(StealthPlugin());

const baseDir = process.env.LAMBDA_TASK_ROOT ? "/tmp" : path.resolve();
const outputDir = path.join(baseDir, "scraped_data");

if (!fs.existsSync(outputDir)) {
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory for screenshots: ${outputDir}`);
  } catch (err) {
    console.error("Failed to create screenshot directory:", err);
  }
}

export const scraper = async (coins) => {
  if (!coins || coins.length === 0) {
    console.log("No coins provided to scrape.");
    return {};
  }

  console.log(`Scraper triggered for coins: ${coins.join(", ")}`);
  const urls = coins.map(
    (coin) => `https://www.coingecko.com/en/coins/${coin}`
  );

  let browser = null;

  const scrapePrice = async (url) => {
    const coin = url.split("/").pop();
    let page;
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        // defaultViewport: chromium.defaultViewport, // Not needed for now
      });

      page = await browser.newPage();

      console.log(`Navigating to ${url} for coin ${coin}`);
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

      const priceSelector = 'span[data-converter-target="price"]';
      console.log(`Waiting for selector ${priceSelector} on ${url}`);
      await page.waitForSelector(priceSelector, { timeout: 60000 });

      const newPrice = await page.evaluate((selector) => {
        const priceSpan = document.querySelector(selector);
        if (!priceSpan) return null;

        const subElement = priceSpan.querySelector("sub[title]");
        if (subElement && subElement.title) {
          return subElement.title;
        } else {
          return priceSpan.innerText.trim().replace(/\s+/g, " ");
        }
      }, priceSelector);

      if (newPrice !== null) {
        console.log(`Extracted price for ${coin}: ${newPrice}`);
        return { coin, newPrice };
      } else {
        console.error(
          `Could not extract price for ${coin} (element or format mismatch).`
        );

        const screenshotPath = path.join(
          outputDir,
          `${coin}_extraction_error.png`
        );

        try {
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`Screenshot saved to ${screenshotPath}`);
        } catch (ssError) {
          console.error(`Failed to take screenshot for ${coin}:`, ssError);
        }
        return {
          coin,
          newPrice: null,
          error: "Price element found but content extraction failed.",
        };
      }
    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      const screenshotPath = path.join(
        outputDir,
        `${coin}_navigation_error.png`
      );
      if (page) {
        try {
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`Screenshot saved to ${screenshotPath}`);
        } catch (ssError) {
          console.error(
            `Failed to take error screenshot for ${coin}:`,
            ssError
          );
        }
      } else {
        console.log(
          `Cannot take screenshot for ${coin} as page object was not created.`
        );
      }
      return { coin, newPrice: null, error: error.message };
    } finally {
      if (browser) {
        await browser.close();
        console.log(`Browser closed for ${coin}`);
      }
    }
  };

  const results = await Promise.all(urls.map(scrapePrice));

  const prices = {};
  results.forEach((result) => {
    if (result && result.coin && result.newPrice) {
      prices[result.coin] = result.newPrice;
    } else if (result && result.coin) {
      prices[result.coin] = null;
      console.log(
        `Failed to get price for ${result.coin}. Error: ${
          result.error || "Unknown reason"
        }`
      );
    }
  });

  console.log(`Scraping finished. Returning prices:`, prices);
  return prices;
};
