import express from 'express';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
const __dirname = path.resolve();
const app = express();
const port = 4200;

const runScraper = async () => {
  const scraper = './index.js';
  const COINS = 'solana,bitcoin,ethereum'; // Coins go here
  const command = `node ${scraper} --coins=${COINS}`;

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.error('Scraper error:', stderr);
    }
    console.log('Scraper:', stdout);
  } catch (err) {
    console.error('Error executing scraper:', err);
    throw err;
  }
};

app.get('/api/price', async (req, res) => {
  try {
    await runScraper();

    const filePath = path.join(__dirname, 'scraped_data', 'prices.txt');
    const data = await fs.promises.readFile(filePath, 'utf8');

    const prices = {};
    const lines = data.trim().split('\n');

    lines.forEach(line => {
      const [coin, price] = line.split(' : ');
      if (coin && price) {
        prices[coin] = price;
      }
    });

    res.json({
      prices
    });
  } catch (err) {
    res.status(500).json({ error: 'Error executing script' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
