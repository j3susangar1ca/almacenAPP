import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.');
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

export interface InvoiceOcrResult {
  supplierName: string;
  ruc: string | null;
  invoiceNumber: string;
  date: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitCost: number;
    batchCode: string;
    expirationDate: string | null;
  }>;
  totalAmount: number;
}

export interface ForecastResult {
  predictions: Array<{
    sku: string;
    name: string;
    estimatedDemand30Days: number;
    riskOfOutage: boolean;
    anomalyDetected: string | null;
  }>;
  recommendations: Array<{
    sku: string;
    name: string;
    recommendedQty: number;
    priority: 'Alta' | 'Media' | 'Baja';
    justification: string;
  }>;
  summary: string;
}

export interface NutritionAuditResult {
  nutritionalEvaluation: string;
  substitutions: Array<{
    originalIngredient: string;
    suggestedSubstitute: string;
    reason: string;
  }>;
  hygieneAdvice: string;
}

export class GeminiAIService {
  /**
   * Processes an invoice image in base64 format using Gemini vision OCR
   * and returns a typed JSON structure for stock entries.
   */
  static async ocrInvoice(imageBase64: string): Promise<InvoiceOcrResult> {
    const ai = getGeminiClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `
      Analiza esta imagen de factura/remisión de proveedor de víveres públicos y extrae la información de manera estructurada.
      Identifica:
      1. Nombre del Proveedor y RUC (si se visualizan).
      2. Número de Factura o Remisión.
      3. Fecha de Emisión.
      4. Lista detallada de productos/víveres (nombre, cantidad, costo unitario, SKU si figura o un SKU autogenerado razonable).
      5. Fecha de Vencimiento de Lote (si se menciona).

      Responde estrictamente en formato JSON con el siguiente esquema exacto:
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini no devolvió ninguna respuesta textual de la factura.');
    }

    return JSON.parse(text) as InvoiceOcrResult;
  }

  /**
   * Analyzes stock and Kardex historical transaction history to produce predictive demand forecasts.
   */
  static async predictDemand(items: any[], transactions: any[]): Promise<ForecastResult> {
    const ai = getGeminiClient();

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
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini no devolvió resultados para la predicción de demanda.');
    }

    return JSON.parse(text) as ForecastResult;
  }

  /**
   * Audits institutional menus, returns nutritional feedback and overstock/near-expiry substitutions.
   */
  static async auditNutrition(menu: any, ingredients: any[], stockItems: any[]): Promise<NutritionAuditResult> {
    const ai = getGeminiClient();

    const prompt = `
      Actúas como un Nutricionista Jefe de Cocina Institucional.
      Analiza la siguiente receta/menú, los ingredientes y los insumos actuales en stock para auditar balance macronutricional y recomendar optimización de costos:

      Menú:
      ${JSON.stringify(menu, null, 2)}

      Ingredientes del menú:
      ${JSON.stringify(ingredients, null, 2)}

      Stock actual en almacén:
      ${JSON.stringify(stockItems, null, 2)}

      Genera:
      1. Evaluación nutricional del menú (proteínas, carbohidratos, balance macro-nutricional, calorías).
      2. Sustituciones sugeridas basadas en insumos de bajo costo o que tengan EXCESO de stock, o que estén próximos a vencer.
      3. Consejos de almacenamiento higiénico para evitar desperdicio de los ingredientes perecederos listados.

      Responde estrictamente en formato JSON con la estructura:
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
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini no devolvió la evaluación de la auditoría nutricional.');
    }

    return JSON.parse(text) as NutritionAuditResult;
  }

  /**
   * Technical and financial assessment of procurement tenders and supplier bids.
   */
  static async evaluateProcurement(tender: any, bids: any[]): Promise<any> {
    const ai = getGeminiClient();

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
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini no devolvió la evaluación de licitación.');
    }

    return JSON.parse(text);
  }
}
