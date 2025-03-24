import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";

const __dirname = path.resolve();
const outputDir = path.join(__dirname, "scraped_data");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
puppeteer.use(StealthPlugin());

export const scraper = async (coins) => {
  console.log(`Scraper triggered...`);
  const urls = coins.map(
    (coin) => `https://www.coingecko.com/en/coins/${coin}`
  );
  puppeteer.use(StealthPlugin());

  const scrapePrice = async (url) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const coin = url.split("/").pop();
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await page.waitForSelector('span[data-converter-target="price"]', {
        timeout: 60000,
      });

      const newPrice = await page.evaluate(() => {
        const priceSpan = document.querySelector(
          'span[data-converter-target="price"]'
        );

        const subElement = priceSpan.querySelector("sub");

        if (subElement && subElement.title) {
          return subElement.title;
        } else {
          return priceSpan.innerText.trim();
        }
      });

      console.log(`Extracted price for ${coin}: ${newPrice}`);
      return { coin, newPrice };
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      // Take a screenshot on error
      await page.screenshot({
        path: path.join(outputDir, `${coin}_error.png`),
        fullPage: true,
      });
      return { coin, newPrice: null, error: error.message };
    } finally {
      await browser.close();
    }
  };

  // Run scrapers concurrently
  const results = await Promise.all(urls.map((url) => scrapePrice(url)));

  // Read existing data from file (if available)
  const fileName = path.join(outputDir, "prices.txt");
  let existingData = {};
  try {
    const data = fs.readFileSync(fileName, "utf8");
    data.split("\n").forEach((line) => {
      const [coin, price] = line.split(" : ");
      if (coin && price) existingData[coin] = price;
    });
  } catch (err) {
    // File may not exist; that's fine.
  }

  // Update the data with new prices
  results.forEach((result) => {
    if (result && result.coin && result.newPrice) {
      existingData[result.coin] = result.newPrice;
    }
  });

  // Write updated data back to file
  const newContent = Object.entries(existingData)
    .map(([coin, price]) => `${coin} : ${price}`)
    .join("\n");
  fs.writeFileSync(fileName, newContent, "utf-8");
  console.log(`Data successfully written to ${fileName}`);

  return existingData;
};
