const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname)); // Serve static site files & uploads directory

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper to read JSON files
const readJson = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') return resolve([]);
                return reject(err);
            }
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                resolve([]);
            }
        });
    });
};

// Helper to write JSON files
const writeJson = (filePath, data) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
};

const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const NEWS_FILE = path.join(__dirname, 'news.json');
const CAREERS_FILE = path.join(__dirname, 'careers.json');

// --- Image File Upload API ---
app.post('/api/upload', (req, res) => {
    try {
        const { base64, filename } = req.body;
        if (!base64) {
            return res.status(400).json({ error: 'Base64 image string required' });
        }

        const matches = base64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({ error: 'Invalid base64 image data' });
        }

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        
        const saveFilename = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
        const targetPath = path.join(uploadsDir, saveFilename);

        fs.writeFile(targetPath, buffer, (err) => {
            if (err) {
                console.error('File save error:', err);
                return res.status(500).json({ error: 'Failed to write uploaded image' });
            }
            res.json({ url: `uploads/${saveFilename}` });
        });
    } catch (e) {
        res.status(500).json({ error: 'Image upload failed' });
    }
});

// --- Dashboard Stats API ---
app.get('/api/stats', async (req, res) => {
    try {
        const products = await readJson(PRODUCTS_FILE);
        const news = await readJson(NEWS_FILE);
        const careers = await readJson(CAREERS_FILE);

        const partners = [...new Set(products.map(p => p.partner).filter(Boolean))];
        const divisions = [...new Set(products.map(p => p.division).filter(Boolean))];

        res.json({
            totalProducts: products.filter(p => p.productName).length,
            totalNews: news.length,
            totalCareers: careers.length,
            totalPartners: partners.length,
            totalDivisions: divisions.length,
            partnersList: partners,
            divisionsList: divisions
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to compute dashboard stats' });
    }
});

// --- Products REST APIs ---

// GET Products
app.get('/api/products', async (req, res) => {
    try {
        const products = await readJson(PRODUCTS_FILE);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read products' });
    }
});

// POST New Product
app.post('/api/products', async (req, res) => {
    try {
        const products = await readJson(PRODUCTS_FILE);
        const newProduct = {
            id: Date.now().toString(),
            productName: req.body.productName || '',
            partner: req.body.partner || '',
            division: req.body.division || '',
            partnerLink: req.body.partnerLink || '',
            description: req.body.description || '',
            image: req.body.image || 'images/default-product.jpg',
            gallery: Array.isArray(req.body.gallery) ? req.body.gallery : []
        };
        products.unshift(newProduct);
        await writeJson(PRODUCTS_FILE, products);
        res.status(201).json({ message: 'Product created successfully', product: newProduct });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add product' });
    }
});

// PUT Update Product
app.put('/api/products/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const products = await readJson(PRODUCTS_FILE);

        if (isNaN(index) || index < 0 || index >= products.length) {
            return res.status(404).json({ error: 'Product index not found' });
        }

        products[index] = {
            ...products[index],
            productName: req.body.productName || products[index].productName,
            partner: req.body.partner || products[index].partner,
            division: req.body.division || products[index].division,
            partnerLink: req.body.partnerLink !== undefined ? req.body.partnerLink : products[index].partnerLink,
            description: req.body.description !== undefined ? req.body.description : products[index].description,
            image: req.body.image || products[index].image,
            gallery: Array.isArray(req.body.gallery) ? req.body.gallery : products[index].gallery || []
        };

        await writeJson(PRODUCTS_FILE, products);
        res.json({ message: 'Product updated successfully', product: products[index] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE Product
app.delete('/api/products/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const products = await readJson(PRODUCTS_FILE);

        if (isNaN(index) || index < 0 || index >= products.length) {
            return res.status(404).json({ error: 'Product index not found' });
        }

        const deleted = products.splice(index, 1);
        await writeJson(PRODUCTS_FILE, products);
        res.json({ message: 'Product deleted successfully', product: deleted[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// SAVE All Products (Bulk update)
app.post('/api/products/bulk', async (req, res) => {
    try {
        await writeJson(PRODUCTS_FILE, req.body);
        res.json({ message: 'Products saved successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save products' });
    }
});

// --- News REST APIs ---

// GET News
app.get('/api/news', async (req, res) => {
    try {
        const news = await readJson(NEWS_FILE);
        res.json(news);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read news' });
    }
});

// POST New Article
app.post('/api/news', async (req, res) => {
    try {
        const news = await readJson(NEWS_FILE);
        const newArticle = {
            id: Date.now(),
            title: req.body.title || 'Untitled News',
            date: req.body.date || new Date().toISOString().split('T')[0],
            content: req.body.content || '',
            image: req.body.image || 'images/default-news.jpg'
        };
        news.unshift(newArticle);
        await writeJson(NEWS_FILE, news);
        res.status(201).json({ message: 'News article created successfully', article: newArticle });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add news article' });
    }
});

// PUT Update News Article
app.put('/api/news/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const news = await readJson(NEWS_FILE);

        if (isNaN(index) || index < 0 || index >= news.length) {
            return res.status(404).json({ error: 'News index not found' });
        }

        news[index] = {
            ...news[index],
            title: req.body.title || news[index].title,
            date: req.body.date || news[index].date,
            content: req.body.content !== undefined ? req.body.content : news[index].content,
            image: req.body.image || news[index].image
        };

        await writeJson(NEWS_FILE, news);
        res.json({ message: 'News article updated successfully', article: news[index] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update news article' });
    }
});

// DELETE News Article
app.delete('/api/news/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const news = await readJson(NEWS_FILE);

        if (isNaN(index) || index < 0 || index >= news.length) {
            return res.status(404).json({ error: 'News index not found' });
        }

        const deleted = news.splice(index, 1);
        await writeJson(NEWS_FILE, news);
        res.json({ message: 'News article deleted successfully', article: deleted[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete news article' });
    }
});

// SAVE All News (Bulk update)
app.post('/api/news/bulk', async (req, res) => {
    try {
        await writeJson(NEWS_FILE, req.body);
        res.json({ message: 'News saved successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save news' });
    }
});

// --- Careers REST APIs ---

// GET Careers
app.get('/api/careers', async (req, res) => {
    try {
        const careers = await readJson(CAREERS_FILE);
        res.json(careers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read careers' });
    }
});

// POST New Career Position
app.post('/api/careers', async (req, res) => {
    try {
        const careers = await readJson(CAREERS_FILE);
        const newCareer = {
            id: Date.now(),
            title: req.body.title || '',
            division: req.body.division || '',
            location: req.body.location || 'Cairo, Egypt',
            type: req.body.type || 'Full Time',
            description: req.body.description || '',
            requirements: req.body.requirements || ''
        };
        careers.unshift(newCareer);
        await writeJson(CAREERS_FILE, careers);
        res.status(201).json({ message: 'Career position created successfully', career: newCareer });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add career position' });
    }
});

// PUT Update Career Position
app.put('/api/careers/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const careers = await readJson(CAREERS_FILE);

        if (isNaN(index) || index < 0 || index >= careers.length) {
            return res.status(404).json({ error: 'Career index not found' });
        }

        careers[index] = {
            ...careers[index],
            title: req.body.title || careers[index].title,
            division: req.body.division || careers[index].division,
            location: req.body.location || careers[index].location,
            type: req.body.type || careers[index].type,
            description: req.body.description !== undefined ? req.body.description : careers[index].description,
            requirements: req.body.requirements !== undefined ? req.body.requirements : careers[index].requirements
        };

        await writeJson(CAREERS_FILE, careers);
        res.json({ message: 'Career position updated successfully', career: careers[index] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update career position' });
    }
});

// DELETE Career Position
app.delete('/api/careers/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const careers = await readJson(CAREERS_FILE);

        if (isNaN(index) || index < 0 || index >= careers.length) {
            return res.status(404).json({ error: 'Career index not found' });
        }

        const deleted = careers.splice(index, 1);
        await writeJson(CAREERS_FILE, careers);
        res.json({ message: 'Career position deleted successfully', career: deleted[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete career position' });
    }
});

// SAVE All Careers (Bulk update)
app.post('/api/careers/bulk', async (req, res) => {
    try {
        await writeJson(CAREERS_FILE, req.body);
        res.json({ message: 'Careers saved successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save careers' });
    }
});

// Start Server with Port Fallback
const startServer = (portToTry) => {
    const server = app.listen(portToTry, () => {
        console.log(`===================================================`);
        console.log(` DMC Website Server running on http://localhost:${portToTry}`);
        console.log(` Admin Control Dashboard: http://localhost:${portToTry}/admin/index.html`);
        console.log(`===================================================`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${portToTry} is in use, trying port ${portToTry + 1}...`);
            startServer(portToTry + 1);
        } else {
            console.error('Server error:', err);
        }
    });
};

startServer(PORT);
