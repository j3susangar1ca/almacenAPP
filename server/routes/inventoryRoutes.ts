import { Router } from 'express';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { updateBackgroundGoogleToken } from '../services/EventListeners';

const router = Router();

function getGoogleAccessToken(req: any): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    updateBackgroundGoogleToken(token); // Update cache for background listeners
    return token;
  }
  return null;
}

// Setup Google Drive Folder Structure
router.post('/workspace/setup-drive', async (req, res) => {
  const token = getGoogleAccessToken(req);
  if (!token) {
    return res.json({ success: false, warning: 'Sincronización externa omitida: Inicie sesión con Google.', localOnly: true });
  }

  try {
    const result = await GoogleDriveService.setupFolders(token);
    res.json(result);
  } catch (error: any) {
    console.error('[INVENTORY ROUTES ERROR] Google Drive setup failed:', error);
    res.json({ success: false, warning: 'Guardado local exitoso; sincronización con Google Drive en cola.', error: error.message });
  }
});

// Sync inventory stock to Google Sheets
router.post('/workspace/sync-sheets', async (req, res) => {
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
    console.error('[INVENTORY ROUTES ERROR] Google Sheets syncing failed:', error);
    res.json({ success: false, warning: 'Sincronización Sheets falló. Datos guardados localmente.', error: error.message });
  }
});

export default router;
