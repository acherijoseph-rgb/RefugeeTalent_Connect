import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ensureSeedData } from './src/db/seed.ts';
import authRoutes from './src/server/routes/auth.ts';
import documentRoutes from './src/server/routes/documents.ts';
import credentialRoutes from './src/server/routes/credentials.ts';
import assessmentRoutes from './src/server/routes/assessments.ts';
import guidanceRoutes from './src/server/routes/guidance.ts';
import networkRoutes from './src/server/routes/network.ts';
import supportRoutes from './src/server/routes/support.ts';
import adminRoutes from './src/server/routes/admin.ts';
import impactRoutes from './src/server/routes/impact.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '6mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Ensure initial reference & demo data is seeded lazily on first API request
  app.use('/api', async (_req, _res, next) => {
    try {
      await ensureSeedData();
    } catch (err) {
      console.error('Seed check error:', err);
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/credentials', credentialRoutes);
  app.use('/api/assessments', assessmentRoutes);
  app.use('/api/guidance', guidanceRoutes);
  app.use('/api', networkRoutes);
  app.use('/api', supportRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/impact', impactRoutes);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RefugeeTalent Connect server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
