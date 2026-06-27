import { Router } from 'express';
import { GeminiAIService } from '../services/GeminiAIService';

const router = Router();

// Endpoint: Forecast AI / Inventory AI
router.post(['/forecast', '/ai/forecast'], async (req, res) => {
  const { items, transactions } = req.body;
  if (!items || !transactions) {
    return res.status(400).json({ success: false, error: 'Faltan datos de inventario y transacciones (Kardex).' });
  }

  try {
    const forecast = await GeminiAIService.predictDemand(items, transactions);
    res.json(forecast);
  } catch (error: any) {
    console.error('[AI ROUTES ERROR] Forecast AI failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Error en Forecast AI' });
  }
});

// Endpoint: Procurement AI / Legal AI
router.post('/procurement-summary', async (req, res) => {
  const { tender, bids } = req.body;
  if (!tender || !bids) {
    return res.status(400).json({ success: false, error: 'Faltan datos de licitaciones u ofertas.' });
  }

  try {
    const evaluation = await GeminiAIService.evaluateProcurement(tender, bids);
    res.json(evaluation);
  } catch (error: any) {
    console.error('[AI ROUTES ERROR] Procurement AI failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Error en Procurement AI' });
  }
});

// Endpoint: Nutrition AI
router.post(['/nutrition-suggestions', '/ai/nutrition'], async (req, res) => {
  const { menu, ingredients, stockItems } = req.body;
  if (!menu || !ingredients) {
    return res.status(400).json({ success: false, error: 'Faltan datos del menú o ingredientes.' });
  }

  try {
    const audit = await GeminiAIService.auditNutrition(menu, ingredients, stockItems || []);
    res.json(audit);
  } catch (error: any) {
    console.error('[AI ROUTES ERROR] Nutrition AI failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Error en Nutrition AI' });
  }
});

// Endpoint: OCR Intelligent Agent
router.post(['/ocr-invoice', '/ai/ocr'], async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ success: false, error: 'No se recibió la imagen de la factura en Base64.' });
  }

  try {
    const result = await GeminiAIService.ocrInvoice(imageBase64);
    res.json(result);
  } catch (error: any) {
    console.error('[AI ROUTES ERROR] OCR Intelligent Agent failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Error en OCR AI' });
  }
});

export default router;
