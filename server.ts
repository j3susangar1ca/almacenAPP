import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Import our core DDD / Clean Architecture services & FSM
import { GoogleDriveService } from './server/services/GoogleDriveService';
import { GoogleSheetsService } from './server/services/GoogleSheetsService';
import { GoogleDocsService } from './server/services/GoogleDocsService';
import { GmailCalendarService } from './server/services/GmailCalendarService';
import { eventBus, EVENTS } from './server/services/EventBus';
import { initEventListeners, updateBackgroundGoogleToken } from './server/services/EventListeners';
import { ProcurementWorkflow, TenderState } from './server/services/ProcurementWorkflow';

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

// Initialize Gemini SDK safely
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    console.log('Gemini API SDK initialized successfully on server-side.');
  } else {
    console.warn('GEMINI_API_KEY not found in environment variables. AI features will fallback gracefully.');
  }
} catch (err) {
  console.error('Error initializing Gemini SDK:', err);
}

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
    geminiInitialized: !!ai,
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

// Finite State Machine (FSM) validation endpoint
app.post('/api/procurement/validate-transition', (req, res) => {
  const { current, target } = req.body;
  if (!current || !target) {
    return res.status(400).json({ success: false, error: 'Faltan estados actual y objetivo.' });
  }
  const isValid = ProcurementWorkflow.isValidTransition(current as TenderState, target as TenderState);
  res.json({
    success: true,
    isValid,
    nextStates: ProcurementWorkflow.getNextStates(current as TenderState)
  });
});

// ==========================================
// 2. Gemini AI Endpoints
// ==========================================

// Endpoint: Forecast AI / Inventory AI
app.post(['/api/gemini/forecast', '/api/ai/forecast'], async (req, res) => {
  if (!ai) {
    return res.status(500).json({ success: false, error: 'Gemini SDK no inicializado. Configure su clave API.' });
  }

  const { items, transactions } = req.body;
  if (!items || !transactions) {
    return res.status(400).json({ success: false, error: 'Faltan datos de inventario y transacciones.' });
  }

  try {
    const prompt = `
      Actúas como Forecast AI y eres un analista de inventario de víveres públicos.
      Analiza la siguiente lista de artículos actuales en stock y su historial de transacciones (Kardex):

      Artículos actuales:
      ${JSON.stringify(items, null, 2)}

      Transacciones del Kardex:
      ${JSON.stringify(transactions, null, 2)}

      Genera un análisis que contenga:
      1. Predicción de demanda estacional para los próximos 30 días.
      2. Alertas de posibles desabastecimientos (riesgos donde la demanda supere el stock actual).
      3. Anomalías detectadas (e.g., picos inusuales de salidas que sugieran desperdicio o fraude).
      4. Recomendaciones de compra prioritarias (con cantidades estimadas a reabastecer).

      Responde estrictamente en un formato JSON estructurado con la siguiente estructura:
      {
        "predictions": [
          { "sku": "SKU", "name": "Nombre", "estimatedDemand30Days": 120, "riskOfOutage": true/false, "anomalyDetected": "descripción o null" }
        ],
        "recommendations": [
          { "sku": "SKU", "name": "Nombre", "recommendedQty": 50, "priority": "Alta" | "Media" | "Baja", "justification": "razón" }
        ],
        "summary": "Resumen general del estado del inventario para el auditor."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '{}';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Forecast AI failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Error en Forecast AI' });
  }
});

// Endpoint: Procurement AI / Legal AI
app.post('/api/gemini/procurement-summary', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ success: false, error: 'Gemini SDK no inicializado.' });
  }

  const { tender, bids } = req.body;
  if (!tender || !bids) {
    return res.status(400).json({ success: false, error: 'Faltan datos de licitaciones u ofertas.' });
  }

  try {
    const prompt = `
      Actúas como Procurement AI, un asesor legal y financiero experto en licitaciones públicas de víveres.
      Evalúa la siguiente licitación y las ofertas de los proveedores concursantes:

      Licitación:
      ${JSON.stringify(tender, null, 2)}

      Ofertas recibidas:
      ${JSON.stringify(bids, null, 2)}

      Genera una evaluación técnica y económica que contenga:
      1. Resumen ejecutivo de cada oferta (fortalezas, debilidades, cumplimiento de pliegos).
      2. Comparación de desviaciones financieras contra el presupuesto base.
      3. Recomendación de adjudicación (cuál proveedor ofrece la mejor relación calidad-precio y es legalmente apto).
      4. Justificación legal redactada formalmente para el Acta de Adjudicación.

      Responde estrictamente en formato JSON:
      {
        "evaluations": [
          { "supplierName": "Proveedor", "score": 95, "pros": ["lista"], "cons": ["lista"], "deviation": "percentage" }
        ],
        "recommendation": {
          "winnerSupplierName": "Proveedor Recomendado",
          "justification": "Redacción de la justificación legal formal"
        },
        "financialSummary": "Análisis comparativo de los costos ofertados vs presupuesto."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '{}';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Procurement AI failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Error en Procurement AI' });
  }
});

// Endpoint: Nutrition AI
app.post(['/api/gemini/nutrition-suggestions', '/api/ai/nutrition'], async (req, res) => {
  if (!ai) {
    return res.status(500).json({ success: false, error: 'Gemini SDK no inicializado.' });
  }

  const { menu, ingredients, stockItems } = req.body;
  if (!menu || !ingredients) {
    return res.status(400).json({ success: false, error: 'Faltan datos del menú o ingredientes.' });
  }

  try {
    const prompt = `
      Actúas como un Nutricionista Jefe de Cocina Institucional.
      Analiza la siguiente receta/menú y los ingredientes actuales en stock:

      Menú:
      ${JSON.stringify(menu, null, 2)}

      Ingredientes del menú:
      ${JSON.stringify(ingredients, null, 2)}

      Stock actual:
      ${JSON.stringify(stockItems, null, 2)}

      Genera:
      1. Evaluación nutricional del menú (proteínas, carbohidratos, balance macro-nutricional).
      2. Sustituciones sugeridas basadas en insumos de bajo costo o que tengan EXCESO de stock, o que estén próximos a vencer.
      3. Consejos de almacenamiento higiénico para evitar desperdicio de los ingredientes perecederos listados.

      Responde estrictamente en formato JSON:
      {
        "nutritionalEvaluation": "Análisis del menú...",
        "substitutions": [
          { "originalIngredient": "Ingrediente original", "suggestedSubstitute": "Sustituto", "reason": "Justificación" }
        ],
        "hygieneAdvice": "Consejos específicos..."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Nutrition AI failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Error en Nutrition AI' });
  }
});

// Endpoint: OCR Intelligent Agent
app.post(['/api/gemini/ocr-invoice', '/api/ai/ocr'], async (req, res) => {
  if (!ai) {
    return res.status(500).json({ success: false, error: 'Gemini SDK no inicializado.' });
  }

  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ success: false, error: 'No se recibió la imagen de la factura en Base64.' });
  }

  try {
    const prompt = `
      Analiza esta imagen de factura/remisión de proveedor de víveres públicos y extrae la información de manera estructurada.
      Identifica:
      1. Nombre del Proveedor y RUC (si se visualizan).
      2. Número de Factura o Remisión.
      3. Fecha de Emisión.
      4. Lista detallada de productos/víveres (nombre, cantidad, costo unitario, SKU si figura).
      5. Fecha de Vencimiento de Lote (si se menciona).

      Responde estrictamente en formato JSON con el siguiente esquema:
      {
        "supplierName": "Proveedor extraído",
        "ruc": "RUC extraído o null",
        "invoiceNumber": "Número extraído",
        "date": "YYYY-MM-DD",
        "items": [
          { "sku": "SKU o autogenerado", "name": "Nombre producto", "quantity": 10, "unitCost": 50, "batchCode": "LOTE-extraído", "expirationDate": "YYYY-MM-DD o null" }
        ],
        "totalAmount": 500
      }
    `;

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64
          }
        },
        prompt
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('OCR Intelligent Agent failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Error en OCR AI' });
  }
});

// ==========================================
// 3. Google Workspace API Proxies (Resilientes)
// ==========================================

// Setup Google Drive Folder Structure
app.post('/api/workspace/setup-drive', async (req, res) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.json({ success: false, warning: 'Sincronización externa omitida: Inicie sesión con Google.', localOnly: true });
  }

  try {
    const result = await GoogleDriveService.setupFolders(token);
    res.json(result);
  } catch (error: any) {
    console.error('Google Drive setup failed:', error);
    res.json({ success: false, warning: 'Guardado local exitoso; sincronización con Google Drive en cola.', error: error.message });
  }
});

// Sincronizar stock a Google Sheets
app.post('/api/workspace/sync-sheets', async (req, res) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.json({ success: false, warning: 'Sincronización Sheets omitida: requiere autenticación.', localOnly: true });
  }

  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, error: 'Items vacíos o no válidos.' });
  }

  try {
    const result = await GoogleSheetsService.syncInventory(token, items);
    res.json(result);
  } catch (error: any) {
    console.error('Google Sheets syncing failed:', error);
    res.json({ success: false, warning: 'Sincronización Sheets falló. Datos guardados localmente.', error: error.message });
  }
});

// Generar Documento de Compra / Adjudicación en Google Docs
app.post('/api/workspace/generate-doc', async (req, res) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.json({ success: false, warning: 'Google Docs bypass: requiere sesión.', localOnly: true });
  }

  const { title, contentTags } = req.body;
  try {
    const result = await GoogleDocsService.generateDocFromTemplate(token, title, contentTags);
    res.json(result);
  } catch (error: any) {
    console.error('Google Docs generation failed:', error);
    res.json({ success: false, warning: 'Falla al estructurar Google Doc en la nube.', error: error.message });
  }
});

// Generar PDF Oficial de Orden de Compra con Código QR (Google Docs + Google Drive)
app.post('/api/workspace/generate-po-pdf', async (req, res) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'La generación de PDF requiere sesión de Google activa.' });
  }

  const { po } = req.body;
  if (!po || !po.id) {
    return res.status(400).json({ success: false, error: 'Faltan los detalles de la orden de compra.' });
  }

  try {
    const pdfBuffer = await GoogleDocsService.generatePoPdf(token, po);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Orden_de_Compra_${po.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Google Docs PDF compile error:', error);
    res.status(500).json({ success: false, error: error.message || 'Error compilando PDF oficial con Google Docs.' });
  }
});

// Enviar correos con Gmail
app.post('/api/workspace/send-email', async (req, res) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.json({ success: false, warning: 'Gmail bypass: requiere sesión.', localOnly: true });
  }

  const { to, subject, htmlBody } = req.body;
  try {
    const result = await GmailCalendarService.sendAlertEmail(token, to, subject, htmlBody);
    res.json(result);
  } catch (error: any) {
    console.error('Gmail send failed:', error);
    res.json({ success: false, warning: 'Guardado exitoso; envío de correo de notificación en cola.', error: error.message });
  }
});

// Logística de Google Calendar
app.post('/api/workspace/add-calendar', async (req, res) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.json({ success: false, warning: 'Calendar bypass: requiere sesión.', localOnly: true });
  }

  const { title, description, date } = req.body;
  try {
    const result = await GmailCalendarService.scheduleCalendarEvent(token, title, description, date);
    res.json(result);
  } catch (error: any) {
    console.error('Google Calendar registration failed:', error);
    res.json({ success: false, warning: 'Registro en Google Calendar en cola.', error: error.message });
  }
});

// ==========================================
// 4. Vite Dev Server & Static Setup
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
