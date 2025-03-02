import express from 'express';
import fs from 'fs';
import path from 'path';

const __dirname = path.resolve();
const app = express();
const port = 4200;

app.get('/api/price', (req, res) => {
  const filePath = path.join(__dirname, 'scraped_data', 'prices.txt');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).json({ error: 'Error reading file' });
    }
    
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
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
