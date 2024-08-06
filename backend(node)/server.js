const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

async function scrapeProducts(domain) {
  try {
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = 'https://' + domain;
    }

    const response = await axios.get(domain);
    const $ = cheerio.load(response.data);

    const productLinks = $('a[href*="/products/"]')
      .map((_, el) => {
        const href = $(el).attr('href');
        return href.startsWith('http') ? href : domain + href;
      })
      .get()
      .filter((value, index, self) => self.indexOf(value) === index)
      .slice(0, 5);
      console.log("Product links below: ");
      console.log(productLinks);

    const products = await Promise.all(productLinks.map(async (url) => {
      const productResponse = await axios.get(url);
      const $product = cheerio.load(productResponse.data);

      const name = $product('h1').first().text().trim();
      const imageUrl = $product('img').first().attr('src');
      const price = $product('.price').first().text().trim() || 'Price not found';
      console.log({ name, imageUrl, price });

      return { name, url, imageUrl, price };
    }));

    return products;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

app.post('/scrape', async (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  try {
    const products = await scrapeProducts(domain);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape products' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
