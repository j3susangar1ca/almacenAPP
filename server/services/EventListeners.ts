import { eventBus, EVENTS } from './EventBus';
import { GmailCalendarService } from './GmailCalendarService';
import { GoogleDriveService } from './GoogleDriveService';

// In-Memory simple token cache to allow background events to use the user's Google Session
let lastSeenGoogleToken: string | null = null;

export function updateBackgroundGoogleToken(token: string) {
  lastSeenGoogleToken = token;
}

// Register Listeners
export function initEventListeners() {
  console.log('[EVENT-BUS] Initializing Event Listeners...');

  // 1. Stock Below Minimum alert listener
  eventBus.on(EVENTS.STOCK_BELOW_MINIMUM, async (payload: { item: any; currentQty: number; minQty: number }) => {
    console.log(`[EVENT-BUS] Listener caught ${EVENTS.STOCK_BELOW_MINIMUM}`);
    if (!lastSeenGoogleToken) {
      console.warn('[EVENT-BUS] Cannot send Google notification; lastSeenGoogleToken is empty.');
      return;
    }

    try {
      const subject = `⚠️ ALERTA DE STOCK CRÍTICO: ${payload.item.name}`;
      const htmlBody = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #E4E4E7; max-width: 600px;">
          <h2 style="color: #DC2626;">Alerta de Desabastecimiento - SIGAL V2</h2>
          <p>Se ha detectado un nivel de stock por debajo del límite mínimo establecido.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background: #F4F4F5;">
              <th style="padding: 8px; border: 1px solid #E4E4E7; text-align: left;">Articulo</th>
              <td style="padding: 8px; border: 1px solid #E4E4E7;">${payload.item.name}</td>
            </tr>
            <tr>
              <th style="padding: 8px; border: 1px solid #E4E4E7; text-align: left;">SKU</th>
              <td style="padding: 8px; border: 1px solid #E4E4E7; font-family: monospace;">${payload.item.sku}</td>
            </tr>
            <tr style="background: #F4F4F5;">
              <th style="padding: 8px; border: 1px solid #E4E4E7; text-align: left;">Stock Actual</th>
              <td style="padding: 8px; border: 1px solid #E4E4E7; font-weight: bold; color: #DC2626;">${payload.currentQty}</td>
            </tr>
            <tr>
              <th style="padding: 8px; border: 1px solid #E4E4E7; text-align: left;">Stock Mínimo</th>
              <td style="padding: 8px; border: 1px solid #E4E4E7;">${payload.minQty}</td>
            </tr>
          </table>
          <p style="margin-top: 20px; font-size: 11px; color: #71717A;">
            Sistema Integrado de Gestión Alimentaria V2 - Gobierno de la República
          </p>
        </div>
      `;
      
      // Send asynchronously using Gmail API
      await GmailCalendarService.sendAlertEmail(lastSeenGoogleToken, 'coordinacion.sigal@gmail.com', subject, htmlBody);
      console.log(`[EVENT-BUS] Critical stock email alert sent successfully for item: ${payload.item.sku}`);
    } catch (err) {
      console.error('[EVENT-BUS] Failed to send critical stock email:', err);
    }
  });

  // 2. Tender Awarded listener
  eventBus.on(EVENTS.TENDER_AWARDED, async (payload: { tender: any; winnerName: string; amount: number }) => {
    console.log(`[EVENT-BUS] Listener caught ${EVENTS.TENDER_AWARDED}`);
    if (!lastSeenGoogleToken) {
      console.warn('[EVENT-BUS] Cannot trigger calendar/gmail; lastSeenGoogleToken is empty.');
      return;
    }

    try {
      // Step A: Schedule logistics start in Calendar (5 days from now)
      const executionDate = new Date();
      executionDate.setDate(executionDate.getDate() + 5);
      const dateStr = executionDate.toISOString().substring(0, 10);

      await GmailCalendarService.scheduleCalendarEvent(
        lastSeenGoogleToken,
        `🚚 Entrega de Víveres - Adjudicación ${payload.tender.id}`,
        `Inicio de la cadena de suministro por parte del proveedor adjudicado: ${payload.winnerName}. Monto contratado: S/. ${payload.amount.toLocaleString()}`,
        dateStr
      );
      console.log(`[EVENT-BUS] Calendar event scheduled for award: ${payload.tender.id}`);

      // Step B: Send Notification to Director
      const subject = `📜 ADJUDICACIÓN DE LICITACIÓN EMITIDA: ${payload.tender.id}`;
      const htmlBody = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #E4E4E7; max-width: 600px;">
          <h2 style="color: #10B981;">Resolución de Adjudicación Pública</h2>
          <p>La licitación con identificador <strong>${payload.tender.id}</strong> ha sido exitosamente adjudicada.</p>
          <ul>
            <li><strong>Licitación:</strong> ${payload.tender.title}</li>
            <li><strong>Proveedor Adjudicado:</strong> ${payload.winnerName}</li>
            <li><strong>Monto Adjudicado:</strong> S/. ${payload.amount.toLocaleString()}</li>
            <li><strong>Fecha estimada de inicio:</strong> ${dateStr} (Registrado en Google Calendar)</li>
          </ul>
          <p style="margin-top: 20px; font-size: 11px; color: #71717A;">
            Oficina General de Logística y Adquisiciones del Estado - SIGAL V2
          </p>
        </div>
      `;
      await GmailCalendarService.sendAlertEmail(lastSeenGoogleToken, 'direccion.sigal@gmail.com', subject, htmlBody);
      console.log('[EVENT-BUS] Award alert email sent.');
    } catch (err) {
      console.error('[EVENT-BUS] Failed to execute background award workflow:', err);
    }
  });

  // 3. Menu Published listener
  eventBus.on(EVENTS.MENU_PUBLISHED, async (payload: { menu: any }) => {
    console.log(`[EVENT-BUS] Listener caught ${EVENTS.MENU_PUBLISHED}`);
    if (!lastSeenGoogleToken) return;

    try {
      // Schedule calendar event for menu day
      const eventDate = payload.menu.date || new Date().toISOString().substring(0, 10);
      await GmailCalendarService.scheduleCalendarEvent(
        lastSeenGoogleToken,
        `🍽️ Menú Institucional: ${payload.menu.name}`,
        `Servicio de alimentación escolar. Calorías: ${payload.menu.calories} kcal. Proteínas: ${payload.menu.protein}g.`,
        eventDate
      );
      console.log('[EVENT-BUS] Menu published scheduled in Calendar.');
    } catch (err) {
      console.error('[EVENT-BUS] Failed to schedule menu event:', err);
    }
  });
}
