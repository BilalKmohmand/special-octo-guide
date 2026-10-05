import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Handle contact form submissions
app.post('/api/contact/contact-us', (req, res) => {
  console.log('[Contact Form Submission]:', req.body);
  res.json({ success: true });
});

// Route for extensionless airo-assets images to set correct Content-Type
app.use('/airo-assets/images', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const relativePath = decodeURIComponent(req.path);
    const filePath = path.join(__dirname, 'airo-assets/images', relativePath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const buf = Buffer.alloc(12);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buf, 0, 12, 0);
      fs.closeSync(fd);
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
        res.setHeader('Content-Type', 'image/png');
      } else if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (buf.toString('utf8', 0, 4) === 'RIFF') {
        res.setHeader('Content-Type', 'image/webp');
      } else if (buf.toString('utf8').includes('<svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
    }
  } catch (err) {
    // Ignore error and proceed to static serving
  }
  next();
});

// Middleware to prevent caching of logos and HTML pages
app.use((req, res, next) => {
  if (
    req.path.includes('logo') ||
    req.path.endsWith('.html') ||
    req.path === '/' ||
    req.path === '/workshops' ||
    req.path === '/faq' ||
    req.path === '/contact'
  ) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Page routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/workshops', (req, res) => {
  res.sendFile(path.join(__dirname, 'workshops.html'));
});

app.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, 'faq.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

// Serve static files with html extension fallback and strict no-cache for logos and html
app.use(express.static(__dirname, {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (filePath.includes('logo') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Asset 404 handler - never return index.html for missing scripts, styles, or media
app.use((req, res, next) => {
  if (
    req.path.startsWith('/assets/') ||
    req.path.startsWith('/cdn-cgi/') ||
    req.path.startsWith('/airo-assets/') ||
    /\.(js|css|json|map|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/i.test(req.path)
  ) {
    return res.status(404).send('Not found');
  }
  next();
});

// Fallback for SPA page routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Only listen if not running on Vercel
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
