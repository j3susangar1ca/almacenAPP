import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Import our routes
import aiRoutes from './server/routes/aiRoutes';
import inventoryRoutes from './server/routes/inventoryRoutes';
import procurementRoutes from './server/routes/procurementRoutes';

import { eventBus } from './server/services/EventBus';
import { initEventListeners, updateBackgroundGoogleToken } from './server/services/EventListeners';

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parsing with a higher limit for OCR image processing
app.use(express.json({ limit: '10mb' }));

// Feature Flags configuration
const FEATURE_FLAGS = {
  EnableAI: true,
  EnableForecast: true,
  EnableOCR: true,
  EnableCalendar: true,
  EnableSupplierPortal: true
};

// Helper to extract Google Auth access token from header
function getGoogleAccessToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    updateBackgroundGoogleToken(token); // Update token cache for background EventBus listeners
    return token;
  }
  return null;
}

// ==========================================
// 1. Core & Observability Endpoints (Módulo A)
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    geminiInitialized: true,
    featureFlags: FEATURE_FLAGS
  });
});

app.post('/api/audit-log', (req, res) => {
  const log = req.body;
  console.log(`[FORENSIC AUDIT LOG] ${log.timestamp} | User: ${log.userName} (${log.userRole}) | Action: ${log.action} | Endpoint: ${log.endpoint}`);
  res.json({ success: true });
});

// Bridge to local Event-Driven Architecture (EDA)
app.post('/api/events/publish', (req, res) => {
  getGoogleAccessToken(req); // Capture and cache token if passed in header
  const { event, payload } = req.body;
  if (!event || !payload) {
    return res.status(400).json({ success: false, error: 'Faltan parámetros event o payload.' });
  }
  eventBus.publish(event, payload);
  res.json({ success: true, message: `Evento "${event}" publicado en el servidor.` });
});

// ==========================================
// 2. Context-Divided Routing (Módulo E & F)
// ==========================================

app.use('/api', aiRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', procurementRoutes);

// ==========================================

async function startServer() {
  // Initialize EventBus event listeners
  initEventListeners();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SIGAL V2 ERP] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
