import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3070);
const distDir = path.join(__dirname, 'dist');

app.disable('x-powered-by');

app.use(
  express.static(distDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      }
    },
  })
);

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log('====================================================================');
  console.log('🚀 8tex - Sistema de Inventario y POS (Textiles Ocho Lukal E.I.R.L.)');
  console.log(`🌐 Servidor activo en : http://localhost:${port}`);
  console.log('====================================================================');
});
