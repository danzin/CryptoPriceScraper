import express from "express";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { scraper } from "./index.js";

const app = express();
const port = 4200;
// Process command-line arguments and convert coins to an array
const argv = yargs(hideBin(process.argv)).option("coins", {
  type: "string",
  description:
    "Comma-separated list of coins to track, as they appear in Coingecko's url. No tickers.",
  default: "bitcoin,ethereum,solana",
  coerce: (arg) => arg.split(","),
}).argv;

const COINS = argv.coins;
console.log("COINS:", COINS);

// Express endpoint that runs the scraper and returns the latest prices from prices.txt
app.get("/api/price", async (req, res) => {
  console.log(`Request received.`);
  try {
    const prices = await scraper(COINS);
    res.json({ prices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error executing scraper" });
  }
});

app.get("/api/:coin", async (req, res) => {
  const coin = req.params.coin.toLowerCase();
  console.log(`Request received for specific coin: ${coin}`);

  try {
    // Scrape only the requested coin
    const prices = await scraper([coin]);

    // Check if we got a price for the requested coin
    if (prices[coin]) {
      res.json({ coin, price: prices[coin] });
    } else {
      res.status(404).json({ error: `No price found for ${coin}` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Error executing scraper for ${coin}` });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Access all prices at: http://localhost:${port}/api/price`);
  console.log(
    `Access individual coin prices at: http://localhost:${port}/api/[coinname]`
  );
});
