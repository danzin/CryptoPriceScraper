import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs';

// Use the stealth plugin to help avoid detection.
puppeteer.use(StealthPlugin());

const outputDir = './scraped_data';

const argv = yargs(hideBin(process.argv)).options('coins', {
  type: 'string',
  description: "Coin's name as show in Coingecko's url. e.g. 'bitcoin' instead of 'btc' \n",
  demandOption: true,
  coerce: (arg) => arg.split(',')
}).argv;

console.log(argv.coins)

// Construct urls based on the tickers
const urls = argv.coins.map(coin => {
  return `https://www.coingecko.com/en/coins/${coin}`;
});

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const scrapePrice = async (url) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const coin = url.split('/').pop();
  const fileName = path.join(outputDir, 'prices.txt');

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForSelector('span[data-converter-target="price"]', { timeout: 60000 });

    const newPrice = await page.$eval(
      'span[data-converter-target="price"]',
      el => el.innerText.trim()
    );


    console.log(`Extracted price for ${url}: ${newPrice}`);

    //Read the existing data
    let existingData = {};
    try {
      const data = fs.readFileSync(fileName, 'utf8');
      data.split('\n').forEach(line => {
        const [coin, price] = line.split(' : ');
        if (coin && price) existingData[coin] = price;
      });
    } catch (err) {
      //that's okay 
    }
    // Update with new price 
    existingData[coin] = newPrice;

    const newContent = Object.entries(existingData)
      .map(([coin, price]) => `${coin} : ${price}`)
      .join('\n');


    fs.writeFileSync(fileName, newContent, 'utf-8');
    console.log(`Data successfully written to ${fileName}`);
    
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    // Take a screenshot on error
    await page.screenshot({ path: 'error_screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
};

(async () => {
  await Promise.all(urls.map(url => scrapePrice(url)));
  console.log('All scrapers completed');
})();
