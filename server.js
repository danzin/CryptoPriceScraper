import express from 'express';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { scraper } from './index.js'



const app = express();
const port = 4200;
// Process command-line arguments and convert coins to an array
const argv = yargs(hideBin(process.argv))
  .option('coins', {
    type: 'string',
    description: "Comma-separated list of coins to track, as they appear in Coingecko's url. No tickers.",
    default: 'bitcoin,ethereum,solana',
    coerce: (arg) => arg.split(',')
  })
  .argv;

const COINS = argv.coins;
console.log('COINS:', COINS);

// Express endpoint that runs the scraper and returns the latest prices
app.get('/api/price', async (req, res) => {
  console.log(`Request received.`)
  try {
    const prices = await scraper(COINS);
    res.json({ prices });
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error executing scraper' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
