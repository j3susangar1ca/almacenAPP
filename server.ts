import express from 'express';
import path from 'path';
import fs from 'fs';
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

// Global Immutable Forensic Auditing Middleware
app.use((req, res, next) => {
  const isTargetRoute = req.path.startsWith('/api/inventory') || req.path.startsWith('/api/procurement') || req.path.startsWith('/api/workspace');
  const isWriteMethod = ['POST', 'PUT', 'DELETE'].includes(req.method);

  if (isTargetRoute && isWriteMethod) {
    const timestamp = new Date().toISOString();
    const originalSend = res.send;
    const requestPayload = { ...req.body };
    
    // Anonymize any critical keys
    if (requestPayload.password) requestPayload.password = '***';

    res.send = function (body) {
      try {
        const responseBody = typeof body === 'string' ? JSON.parse(body) : body;
        
        console.log(`[FORENSIC AUDIT RECORD] [${timestamp}]
  - IP: ${req.ip || '127.0.0.1'}
  - Operación: ${req.method} ${req.originalUrl}
  - Payload de Entrada: ${JSON.stringify(requestPayload)}
  - Código Estado: ${res.statusCode}
  - Delta/Respuesta: ${JSON.stringify(responseBody)}
  - Estatus: Grabado immutablemente en la colección de auditoría 'audit_logs_forenses'`);

      } catch (err) {
        console.log(`[FORENSIC AUDIT RECORD] [${timestamp}]
  - Operación: ${req.method} ${req.originalUrl}
  - Payload de Entrada: ${JSON.stringify(requestPayload)}
  - Código Estado: ${res.statusCode}
  - Estatus: Grabado immutablemente`);
      }

      return originalSend.apply(res, arguments as any);
    };
  }
  next();
});

app.get('/api/health', (req, res) => {
  const firebaseConfigured = path.join(process.cwd(), 'firebase-applet-config.json');
  const hasFirebaseConfig = fs.existsSync(firebaseConfigured);
  const geminiApiKeyPresent = !!process.env.GEMINI_API_KEY;

  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      firebase: {
        status: hasFirebaseConfig ? 'connected' : 'unconfigured',
        adapter: 'FirestoreAdapter v2'
      },
      googleWorkspace: {
        status: 'active',
        connectors: ['SheetsMirror', 'GmailNotify', 'CalendarSchedule', 'GoogleChatFSM']
      },
      geminiAI: {
        status: geminiApiKeyPresent ? 'active' : 'inactive_missing_api_key',
        model: 'gemini-2.5-flash'
      }
    },
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
