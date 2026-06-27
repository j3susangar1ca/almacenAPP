import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

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
    return authHeader.substring(7);
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

// ==========================================
// 2. Gemini AI Endpoints
// ==========================================

// Endpoint: Forecast AI / Inventory AI
app.post('/api/gemini/forecast', async (req, res) => {
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
app.post('/api/gemini/nutrition-suggestions', async (req, res) => {
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
app.post('/api/gemini/ocr-invoice', async (req, res) => {
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
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Create Root folder "/SIGAL_DATA"
    const rootRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'SIGAL_DATA',
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!rootRes.ok) throw new Error('Failed to create SIGAL_DATA folder');
    const rootData = await rootRes.json();
    const rootId = rootData.id;

    // Create Year Folder
    const yearRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: String(year),
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootId]
      })
    });
    const yearData = await yearRes.json();

    // Create Month Folder
    const monthRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: month,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [yearData.id]
      })
    });
    const monthData = await monthRes.json();

    // Create Subfolders: /Pedidos, /Licitaciones, /Menus, /Reportes
    const subfolders = ['Pedidos', 'Licitaciones', 'Menus', 'Reportes'];
    const subfolderIds: Record<string, string> = {};

    for (const folder of subfolders) {
      const fRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folder,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [monthData.id]
        })
      });
      const fData = await fRes.json();
      subfolderIds[folder] = fData.id;
    }

    res.json({
      success: true,
      rootFolderId: rootId,
      subfolders: subfolderIds
    });
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
    // 1. Create a Spreadsheet
    const sheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `SIGAL V2 - Balance de Inventario ${new Date().toISOString().substring(0,10)}`
        }
      })
    });

    if (!sheetRes.ok) throw new Error('No se pudo crear la hoja de cálculo.');
    const sheetData = await sheetRes.json();
    const spreadsheetId = sheetData.spreadsheetId;

    // 2. Prepare headers and values
    const values = [
      ['SKU', 'Artículo', 'Categoría', 'Unidad de Medida', 'Costo Unitario', 'Stock Actual', 'Stock Mínimo', 'Lote', 'Vencimiento'],
      ...items.map((i: any) => [
        i.sku, i.name, i.category, i.unit, i.unitCost, i.stockActual, i.stockMinimo, i.batchCode || '', i.expirationDate || ''
      ])
    ];

    // 3. Write data to sheet
    const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });

    if (!writeRes.ok) throw new Error('Error al escribir celdas en Google Sheets.');

    res.json({
      success: true,
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    });
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

  const { title, contentTags } = req.body; // contentTags: { "{{PROVEEDOR}}": "Ventas S.A.", ... }
  try {
    // 1. Create Doc
    const docRes = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    if (!docRes.ok) throw new Error('No se pudo crear Google Doc');
    const docData = await docRes.json();
    const documentId = docData.documentId;

    // 2. Populate text with markers
    const textContent = `
=========================================
      SIGAL V2 ERP - DOCUMENTO OFICIAL
=========================================
Fecha de Generación: ${new Date().toLocaleDateString()}

PROVEEDOR: {{PROVEEDOR}}
RUC: {{RUC}}
MONTO CONTRACTUAL: {{MONTO}}
JUSTIFICACIÓN: {{JUSTIFICACION}}

Aprobado y auditado por la Dirección General de Abastecimiento de Víveres Públicos.
    `;

    // Insert original text first
    await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: textContent
            }
          }
        ]
      })
    });

    // 3. Replace all Tags/Markers
    const requests: any[] = [];
    Object.entries(contentTags).forEach(([tag, replacement]) => {
      requests.push({
        replaceAllText: {
          containsText: { text: tag, matchCase: true },
          replaceText: String(replacement)
        }
      });
    });

    await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    res.json({
      success: true,
      documentId,
      url: `https://docs.google.com/document/d/${documentId}/edit`
    });
  } catch (error: any) {
    console.error('Google Docs generation failed:', error);
    res.json({ success: false, warning: 'Falla al estructurar Google Doc en la nube.', error: error.message });
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
    const rawMessage = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      htmlBody
    ].join('\n');

    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const emailRes = await fetch('https://gmail.googleapis.com/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedMessage })
    });

    if (!emailRes.ok) {
      throw new Error('Gmail API devolvió error de despacho');
    }

    res.json({ success: true, msg: 'Email enviado con éxito vía Gmail.' });
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
    const eventRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: title,
        description,
        start: { date: date }, // All day event
        end: { date: date }
      })
    });

    if (!eventRes.ok) throw new Error('Falla en la API de Google Calendar');

    res.json({ success: true, msg: 'Evento agendado con éxito.' });
  } catch (error: any) {
    console.error('Google Calendar registration failed:', error);
    res.json({ success: false, warning: 'Registro en Google Calendar en cola.', error: error.message });
  }
});

// ==========================================
// 4. Vite Dev Server & Static Setup
// ==========================================

async function startServer() {
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
