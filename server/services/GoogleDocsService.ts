import fetch from 'node-fetch';

export class GoogleDocsService {
  static async generateDocFromTemplate(token: string, title: string, contentTags: Record<string, string>): Promise<any> {
    const docRes = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    if (!docRes.ok) throw new Error('No se pudo crear el documento en Google Docs API.');
    const docData = (await docRes.json()) as any;
    const documentId = docData.documentId;

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

    // 1. Write the base template
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

    // 2. Perform replacement of all template tags
    const requests: any[] = [];
    Object.entries(contentTags).forEach(([tag, val]) => {
      requests.push({
        replaceAllText: {
          containsText: { text: tag, matchCase: true },
          replaceText: String(val)
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

    return {
      success: true,
      documentId,
      url: `https://docs.google.com/document/d/${documentId}/edit`
    };
  }

  static async generatePoPdf(token: string, po: any): Promise<Buffer> {
    const docRes = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: `Orden de Compra Oficial - ${po.id}` })
    });

    if (!docRes.ok) {
      const errorText = await docRes.text();
      throw new Error(`Google Docs API failed to create document: ${errorText}`);
    }
    const docData = (await docRes.json()) as any;
    const documentId = docData.documentId;

    const itemsText = po.items.map((item: any, idx: number) => 
      `${idx + 1}. SKU: ${item.sku}\n   Artículo: ${item.name}\n   Cantidad: ${item.quantity} unidades\n   Costo Unitario: S/. ${item.unitCost.toLocaleString()}\n   Subtotal: S/. ${(item.quantity * item.unitCost).toLocaleString()}`
    ).join('\n\n');

    const textContent = `
============================================================
           SIGAL V2 ERP - GOBIERNO DE LA REPÚBLICA
        SISTEMA INTEGRADO DE GESTIÓN ALIMENTARIA V2
============================================================

ORDEN DE COMPRA OFICIAL (ORDER OF PURCHASE)
------------------------------------------------------------
ID de la Orden: ${po.id}
Fecha de Emisión: ${new Date(po.createdAt || Date.now()).toLocaleString()}
Código Presupuestario: ${po.budgetCode || 'P-101'}
Estado: ${po.status}

------------------------------------------------------------
PROVEEDOR ADJUDICADO
------------------------------------------------------------
Razón Social: ${po.supplierName}
ID Proveedor: ${po.supplierId}
RUC: 20554488331 (Distribuidora Alimenticia) / 20113344558 (Frigorífico)

------------------------------------------------------------
DETALLES DEL PEDIDO DE VÍVERES PÚBLICOS
------------------------------------------------------------
${itemsText}

------------------------------------------------------------
RESUMEN ECONÓMICO
------------------------------------------------------------
Monto Total Comprometido: S/. ${po.totalAmount.toLocaleString()}
Plazo de Entrega: 48 horas en Almacén Central

------------------------------------------------------------
CÓDIGO QR PARA CONTROL FÍSICO Y LOGÍSTICO
------------------------------------------------------------
Escanee este código en el ingreso del almacén de destino:



------------------------------------------------------------
Documento de Abastecimiento Oficial de la Nación.
Firma Autorizada: Dirección General de Logística y Abastecimiento
`;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(po.id)}`;
    
    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            insertInlineImage: {
              uri: qrUrl,
              location: { index: 1 },
              objectSize: {
                height: { magnitude: 130, unit: 'PT' },
                width: { magnitude: 130, unit: 'PT' }
              }
            }
          },
          {
            insertText: {
              location: { index: 1 },
              text: textContent
            }
          }
        ]
      })
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      throw new Error(`Google Docs batchUpdate failed: ${errorText}`);
    }

    // Export Doc to PDF
    const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}/export?mimeType=application/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!exportRes.ok) {
      const errorText = await exportRes.text();
      throw new Error(`Google Drive API failed to export PDF: ${errorText}`);
    }

    const pdfBuffer = await exportRes.arrayBuffer();
    return Buffer.from(pdfBuffer);
  }
}
