import fetch from 'node-fetch';

export class GoogleSheetsService {
  static async syncInventory(token: string, items: any[]): Promise<any> {
    const sheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `SIGAL V2 - Balance de Inventario ${new Date().toISOString().substring(0, 10)}`
        }
      })
    });

    if (!sheetRes.ok) throw new Error('No se pudo inicializar la hoja de cálculo en Sheets API.');
    const sheetData = (await sheetRes.json()) as any;
    const spreadsheetId = sheetData.spreadsheetId;

    const values = [
      ['SKU', 'Artículo', 'Categoría', 'Unidad de Medida', 'Costo Unitario', 'Stock Actual', 'Stock Mínimo', 'Lote', 'Vencimiento'],
      ...items.map((i: any) => [
        i.sku, i.name, i.category, i.unit, i.unitCost, i.stockActual, i.stockMinimo, i.batchCode || '', i.expirationDate || ''
      ])
    ];

    const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });

    if (!writeRes.ok) throw new Error('No se pudieron escribir las celdas de balance de inventario en Sheets.');

    return {
      success: true,
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    };
  }
}
