import express from "express";
import serverless from "serverless-http";
import { scraper } from "./scraper.js";

const app = express();

app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.path}`);
  next();
});

app.get("/api/price/:coins", async (req, res) => {
  const coinsParam = req.params.coins ? req.params.coins.toLowerCase() : "";
  const coinArray = coinsParam.split(",").filter((coin) => coin.trim() !== "");

  if (coinArray.length === 0) {
    console.log("Request received with no valid coins specified.");
    return res.status(400).json({
      error: "No coins specified in the URL path.",
      usage: "e.g., /api/price/bitcoin,ethereum",
    });
  }

  console.log(`Request received for specific coins: ${coinArray.join(", ")}`);

  try {
    const prices = await scraper(coinArray);

    if (Object.keys(prices).length > 0) {
      const successfulPrices = {};
      let foundAny = false;
      coinArray.forEach((requestedCoin) => {
        if (
          prices[requestedCoin] !== undefined &&
          prices[requestedCoin] !== null
        ) {
          successfulPrices[requestedCoin] = prices[requestedCoin];
          foundAny = true;
        }
      });

      if (foundAny) {
        console.log("Sending successful prices:", successfulPrices);
        res.json({ prices: successfulPrices });
      } else {
        console.log(
          "Scraping ran, but no prices could be determined for requested coins:",
          coinArray
        );
        res.status(404).json({
          error: `Could not retrieve prices for the requested coins. Check coin names and CoinGecko status.`,
          requested: coinArray,
          details: prices,
        });
      }
    } else {
      console.log("Scraper returned empty results.");
      res.status(404).json({
        error: `No prices found for the requested coins. The scraper might have failed.`,
        requested: coinArray,
      });
    }
  } catch (err) {
    console.error("Unhandled error during scraping execution:", err);
    res.status(500).json({
      error: `Error executing scraper`,
      coins: coinArray,
      message: err.message || "An unexpected error occurred.",
    });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "Crypto Scraper API. Use /api/price/{coins} endpoint." });
});

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const port = 4200;
  app.listen(port, () => {
    console.log(`Server running locally at http://localhost:${port}`);
    console.log(
      `Example usage: http://localhost:${port}/api/price/bitcoin,ethereum`
    );
  });
}

export const handler = serverless(app);
