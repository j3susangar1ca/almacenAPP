import { Router, Request, Response } from 'express';
import { GoogleDocsService } from '../services/GoogleDocsService';
import { GmailCalendarService } from '../services/GmailCalendarService';
import { GooglePeopleService } from '../services/GooglePeopleService';
import { GoogleChatService } from '../services/GoogleChatService';
import { ProcurementWorkflow, TenderState } from '../services/ProcurementWorkflow';
import { updateBackgroundGoogleToken } from '../services/EventListeners';

const router = Router();

function getGoogleAccessToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    updateBackgroundGoogleToken(token);
    return token;
  }
  return null;
}

// Finite State Machine (FSM) validation endpoint
router.post('/procurement/validate-transition', (req: Request, res: Response) => {
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

// Generar Documento de Compra / Adjudicación en Google Docs
router.post('/workspace/generate-doc', async (req: Request, res: Response) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.json({ success: false, warning: 'Google Docs bypass: requiere sesión.', localOnly: true });
  }

  const { title, contentTags } = req.body;
  try {
    const result = await GoogleDocsService.generateDocFromTemplate(token, title, contentTags);
    res.json(result);
  } catch (error: any) {
    console.error('[PROCUREMENT ROUTES ERROR] Google Docs generation failed:', error);
    res.json({ success: false, warning: 'Falla al estructurar Google Doc en la nube.', error: error.message });
  }
});

// Generar PDF Oficial de Orden de Compra con Código QR (Google Docs + Google Drive)
router.post('/workspace/generate-po-pdf', async (req: Request, res: Response) => {
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
    console.error('[PROCUREMENT ROUTES ERROR] Google Docs PDF compile error:', error);
    res.status(500).json({ success: false, error: error.message || 'Error compilando PDF oficial con Google Docs.' });
  }
});

// Enviar correos con Gmail
router.post('/workspace/send-email', async (req: Request, res: Response) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.json({ success: false, warning: 'Gmail bypass: requiere sesión.', localOnly: true });
  }

  const { to, subject, htmlBody } = req.body;
  try {
    const result = await GmailCalendarService.sendAlertEmail(token, to, subject, htmlBody);
    res.json(result);
  } catch (error: any) {
    console.error('[PROCUREMENT ROUTES ERROR] Gmail send failed:', error);
    res.json({ success: false, warning: 'Guardado exitoso; envío de correo de notificación en cola.', error: error.message });
  }
});

// Logística de Google Calendar
router.post('/workspace/add-calendar', async (req: Request, res: Response) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.json({ success: false, warning: 'Calendar bypass: requiere sesión.', localOnly: true });
  }

  const { title, description, date } = req.body;
  try {
    const result = await GmailCalendarService.scheduleCalendarEvent(token, title, description, date);
    res.json(result);
  } catch (error: any) {
    console.error('[PROCUREMENT ROUTES ERROR] Google Calendar registration failed:', error);
    res.json({ success: false, warning: 'Registro en Google Calendar en cola.', error: error.message });
  }
});

// Google People API / Contacts
router.get('/workspace/contacts', async (req: Request, res: Response) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado: inicie sesión con Google.' });
  }

  try {
    const contacts = await GooglePeopleService.listContacts(token);
    res.json({ success: true, contacts });
  } catch (error: any) {
    console.error('[PROCUREMENT ROUTES ERROR] Google People API list contacts failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Falla al listar contactos de Google.' });
  }
});

router.post('/workspace/contacts', async (req: Request, res: Response) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado: inicie sesión con Google.' });
  }

  const { givenName, familyName, email, phone, organization, title } = req.body;
  if (!givenName) {
    return res.status(400).json({ success: false, error: 'Falta el nombre obligatorio para el contacto.' });
  }

  try {
    const contact = await GooglePeopleService.createContact(token, {
      givenName,
      familyName: familyName || '',
      email,
      phone,
      organization,
      title
    });
    res.json({ success: true, contact });
  } catch (error: any) {
    console.error('[PROCUREMENT ROUTES ERROR] Google People API create contact failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Falla al crear contacto en Google.' });
  }
});

// Google Chat API
router.get('/workspace/chat-spaces', async (req: Request, res: Response) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado: inicie sesión con Google.' });
  }

  try {
    const spaces = await GoogleChatService.listSpaces(token);
    res.json({ success: true, spaces });
  } catch (error: any) {
    console.error('[PROCUREMENT ROUTES ERROR] Google Chat API list spaces failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Falla al listar espacios de Google Chat.' });
  }
});

router.post('/workspace/chat-message', async (req: Request, res: Response) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado: inicie sesión con Google.' });
  }

  const { spaceName, text } = req.body;
  if (!spaceName || !text) {
    return res.status(400).json({ success: false, error: 'Faltan parámetros spaceName o text.' });
  }

  try {
    const message = await GoogleChatService.sendMessage(token, spaceName, text);
    res.json({ success: true, message });
  } catch (error: any) {
    console.error('[PROCUREMENT ROUTES ERROR] Google Chat API send message failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Falla al enviar mensaje de Google Chat.' });
  }
});

export default router;
