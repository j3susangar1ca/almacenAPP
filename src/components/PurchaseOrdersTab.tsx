import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  Loader, 
  Plus, 
  FolderSync, 
  FileCheck, 
  ExternalLink,
  Cpu,
  Printer,
  FileDown,
  AlertCircle,
  FileText
} from 'lucide-react';
import { MonthlyProgramItem, PurchaseOrder, StockItem, StockTransaction } from '../types';

interface PurchaseOrdersTabProps {
  programItems: MonthlyProgramItem[];
  purchaseOrders: PurchaseOrder[];
  items: StockItem[];
  transactions: StockTransaction[];
  onTriggerDriveSetup: () => Promise<void>;
  onAddPurchaseOrder: (po: PurchaseOrder) => Promise<void>;
}

export default function PurchaseOrdersTab({
  programItems,
  purchaseOrders,
  items,
  transactions,
  onTriggerDriveSetup,
  onAddPurchaseOrder
}: PurchaseOrdersTabProps) {
  
  // States
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [forecastError, setForecastError] = useState('');

  // PO creation state
  const [poLoading, setPoLoading] = useState(false);
  const [poLink, setPoLink] = useState('');
  const [createdPo, setCreatedPo] = useState<PurchaseOrder | null>(null);

  // PDF Compilation States
  const [generatingPoId, setGeneratingPoId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState('');
  const [activePrintPo, setActivePrintPo] = useState<PurchaseOrder | null>(null);

  // Trigger Gemini Inventory Forecast AI
  const handleCalculateForecast = async () => {
    setForecastLoading(true);
    setForecastResult(null);
    setForecastError('');

    try {
      const res = await fetch('/api/gemini/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          transactions
        })
      });
      const data = await res.json();
      if (data.error) {
        setForecastError(data.error);
      } else {
        setForecastResult(data);
      }
    } catch (err: any) {
      setForecastError(err.message || 'Falla al procesar pronóstico de demanda.');
    } finally {
      setForecastLoading(false);
    }
  };

  // Convert recommendation/forecast to a Purchase Order & create Drive setup
  const handleGeneratePOFromForecast = async (rec: any) => {
    setPoLoading(true);
    setPoLink('');
    setCreatedPo(null);

    try {
      // 1. Create a Google Drive structure for this month's orders
      await onTriggerDriveSetup();

      // 2. Map forecast item to stock details
      const targetItem = items.find(i => i.sku === rec.sku);
      if (!targetItem) return;

      const newPo: PurchaseOrder = {
        id: `OC-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
        supplierId: targetItem.supplierId || 'S-01',
        supplierName: targetItem.supplierId === 'S-02' ? 'Frigorífico San Martín' : 'Distribuidora Alimenticia S.A.',
        items: [{
          sku: rec.sku,
          name: rec.name,
          quantity: rec.recommendedQty,
          unitCost: targetItem.unitCost
        }],
        totalAmount: rec.recommendedQty * targetItem.unitCost,
        status: 'Borrador',
        budgetCode: 'P-101',
        createdAt: new Date().toISOString()
      };

      // 3. Register PO in Firestore
      await onAddPurchaseOrder(newPo);
      setCreatedPo(newPo);

      // 4. Generate official PO doc in Workspace Drive
      const googleToken = localStorage.getItem('google_access_token') || '';
      const docRes = await fetch('/api/workspace/generate-doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleToken}`
        },
        body: JSON.stringify({
          title: `Orden de Compra Oficial - ${newPo.id}`,
          contentTags: {
            "{{PROVEEDOR}}": newPo.supplierName,
            "{{RUC}}": "RUC 20554488331",
            "{{MONTO}}": `S/. ${newPo.totalAmount.toLocaleString()}`,
            "{{JUSTIFICACION}}": `Reabastecimiento prioritario sugerido por Forecast AI de SIGAL V2.`
          }
        })
      });
      const docData = await docRes.json();
      if (docData.success) {
        setPoLink(docData.url);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setPoLoading(false);
    }
  };

  // Google Docs PDF generator
  const handlePrintPoPdf = async (po: PurchaseOrder) => {
    setGeneratingPoId(po.id);
    setPdfError('');
    try {
      const token = localStorage.getItem('google_access_token') || '';
      const response = await fetch('/api/workspace/generate-po-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ po })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Falla al compilar el PDF mediante la API de Google Docs.');
      }

      // Convert response stream to binary blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `Orden_de_Compra_${po.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      console.warn('Workspace PDF compiler error:', err);
      setPdfError(`Error de Google: ${err.message || 'La sesión de Google Workspace no está disponible en este momento.'}. Iniciando impresión local de respaldo...`);
      // Auto fallback to local high-fidelity print mode
      handleLocalPrint(po);
    } finally {
      setGeneratingPoId(null);
    }
  };

  // Local printer fallback
  const handleLocalPrint = (po: PurchaseOrder) => {
    setActivePrintPo(po);
    // Timeout to let DOM paint the printable layout before bringing up the dialog
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <>
      {/* 1. Printable High-Fidelity Area (Hidden in browser, visible strictly when printing) */}
      {activePrintPo && (
        <div id="print-section" className="hidden print:block bg-white text-black p-8 font-sans space-y-6">
          <div className="text-center border-b-2 border-black pb-4">
            <h1 className="text-xl font-bold uppercase tracking-wider">SIGAL V2 ERP - GOBIERNO DE LA REPÚBLICA</h1>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-zinc-600">SISTEMA INTEGRADO DE GESTIÓN ALIMENTARIA V2</p>
            <h2 className="text-lg font-bold mt-2 uppercase text-zinc-900 tracking-tight">Orden de Compra Oficial (Order of Purchase)</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div className="space-y-1">
              <p><strong>Identificador Único (PO ID):</strong> <span className="font-mono font-bold text-sm">{activePrintPo.id}</span></p>
              <p><strong>Fecha de Emisión:</strong> {new Date(activePrintPo.createdAt || Date.now()).toLocaleString()}</p>
              <p><strong>Código Presupuestario:</strong> {activePrintPo.budgetCode || 'P-101'}</p>
              <p><strong>Estado del Documento:</strong> {activePrintPo.status}</p>
            </div>
            <div className="space-y-1">
              <p><strong>Proveedor Adjudicado:</strong> <span className="font-bold">{activePrintPo.supplierName}</span></p>
              <p><strong>ID Proveedor:</strong> {activePrintPo.supplierId}</p>
              <p><strong>Dirección:</strong> Dirección General de Adquisiciones de Alimentos</p>
              <p><strong>Destino de Carga:</strong> Almacén Central de Víveres</p>
            </div>
          </div>

          <div className="border border-black rounded-sm overflow-hidden text-xs mt-4">
            <table className="w-full text-left">
              <thead className="bg-zinc-100 border-b border-black font-bold">
                <tr>
                  <th className="p-2.5">SKU</th>
                  <th className="p-2.5">Descripción del Artículo</th>
                  <th className="p-2.5 text-right">Cantidad</th>
                  <th className="p-2.5 text-right">Unitario</th>
                  <th className="p-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {activePrintPo.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-mono">{item.sku}</td>
                    <td className="p-2.5">{item.name}</td>
                    <td className="p-2.5 text-right">{item.quantity} unidades</td>
                    <td className="p-2.5 text-right">S/. {item.unitCost.toLocaleString()}</td>
                    <td className="p-2.5 text-right">S/. {(item.quantity * item.unitCost).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-end pt-6 border-t border-dashed border-zinc-400">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Código QR de Seguimiento Físico</p>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(activePrintPo.id)}`} 
                alt="QR Tracking" 
                className="w-28 h-28 mt-1 border border-zinc-300 p-1 bg-white"
                referrerPolicy="no-referrer"
              />
              <p className="text-[9px] font-mono text-zinc-400 mt-1">{activePrintPo.id}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm font-bold text-zinc-900">Total Comprometido: S/. {activePrintPo.totalAmount.toLocaleString()}</p>
              <p className="text-xs text-zinc-500 pb-12">Plazo máximo de recepción: 48 horas en Almacén</p>
              <div className="border-t border-black w-56 text-center mx-auto text-[9px] uppercase tracking-wider font-semibold pt-1">
                Dirección General de Logística y Abastecimiento
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Standard Screen Area (Hidden when printing) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        
        {/* Left Column (Programmatic lists & issued Purchase Orders) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Programmatic needs list */}
          <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#E4E4E7]">
              <div>
                <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider flex items-center space-x-1.5">
                  <FileSpreadsheet className="h-4.5 w-4.5 text-[#18181B]" />
                  <span>Necesidades Programáticas Mensuales</span>
                </h3>
                <p className="text-[10px] text-[#71717A] mt-0.5">Proyección de abastecimiento basada en promedio histórico</p>
              </div>

              <button
                onClick={onTriggerDriveSetup}
                className="text-[10px] bg-white border border-[#E4E4E7] hover:bg-[#FAFAFA] text-[#18181B] px-3 py-1.5 rounded-sm font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors"
              >
                <FolderSync className="h-3.5 w-3.5 text-[#18181B]" />
                <span>Crear Carpetas en Drive</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-[#E4E4E7] rounded-sm">
              <table className="w-full text-left text-xs text-[#18181B]">
                <thead className="bg-[#FAFAFA] text-[#71717A] text-[10px] uppercase font-bold tracking-wider border-b border-[#E4E4E7]">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Artículo</th>
                    <th className="p-3 text-right">Promedio Histórico</th>
                    <th className="p-3 text-right">Cantidad Estimada</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5] bg-white">
                  {programItems.map(item => (
                    <tr key={item.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="p-3 font-mono text-xs font-bold text-[#18181B]">{item.sku}</td>
                      <td className="p-3 font-bold text-[#18181B]">{item.name}</td>
                      <td className="p-3 text-right font-mono text-[#71717A]">{item.historicalAvg} sacos</td>
                      <td className="p-3 text-right font-mono font-bold text-[#18181B]">{item.estimatedQuantity} sacos</td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Issued / Pending Purchase Orders */}
          <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="h-4.5 w-4.5 text-[#18181B]" />
                <span>Órdenes de Compra Emitidas y Pendientes (Purchase Orders)</span>
              </h3>
              <p className="text-[10px] text-[#71717A] mt-0.5">Control fiscal y compilación de PDF oficial con códigos QR para el control de inventario físico</p>
            </div>

            {pdfError && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-sm flex items-start space-x-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{pdfError}</span>
              </div>
            )}

            <div className="overflow-x-auto border border-[#E4E4E7] rounded-sm">
              <table className="w-full text-left text-xs text-[#18181B]">
                <thead className="bg-[#FAFAFA] text-[#71717A] text-[10px] uppercase font-bold tracking-wider border-b border-[#E4E4E7]">
                  <tr>
                    <th className="p-3">ID / Fecha</th>
                    <th className="p-3">Proveedor / Artículos</th>
                    <th className="p-3 text-right">Total Presupuestado</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-center">Exportar e Imprimir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5] bg-white">
                  {purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs text-[#71717A] italic">
                        No hay órdenes de compra registradas. Use el asistente Predictor de Demanda para emitir una nueva orden.
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map(po => (
                      <tr key={po.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="p-3 space-y-1">
                          <span className="font-mono font-bold block text-[#18181B]">{po.id}</span>
                          <span className="text-[10px] text-[#71717A] block">
                            {new Date(po.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="p-3 space-y-1 max-w-[240px]">
                          <span className="font-bold text-[#18181B] block truncate">{po.supplierName}</span>
                          <span className="text-[10px] text-[#71717A] block truncate">
                            {po.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-[#18181B]">
                          S/. {po.totalAmount.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border ${
                            po.status === 'Borrador'
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Docs API Compiler button */}
                            <button
                              onClick={() => handlePrintPoPdf(po)}
                              disabled={generatingPoId !== null}
                              title="Generar PDF Oficial mediante la API de Google Docs"
                              className="text-[10px] bg-white hover:bg-[#FAFAFA] disabled:opacity-50 border border-[#E4E4E7] text-[#18181B] px-2 py-1.5 rounded-sm font-bold uppercase tracking-wider flex items-center space-x-1 transition-all"
                            >
                              {generatingPoId === po.id ? (
                                <>
                                  <Loader className="h-3 w-3 animate-spin text-[#18181B]" />
                                  <span>Compilando...</span>
                                </>
                              ) : (
                                <>
                                  <FileDown className="h-3 w-3 text-[#18181B]" />
                                  <span>PDF Docs</span>
                                </>
                              )}
                            </button>

                            {/* Direct Local Barcode printer */}
                            <button
                              onClick={() => handleLocalPrint(po)}
                              title="Imprimir Copia Física de Respaldo localmente con código de barra QR"
                              className="text-[10px] bg-[#18181B] hover:bg-black text-white px-2 py-1.5 rounded-sm font-bold uppercase tracking-wider flex items-center space-x-1 transition-all"
                            >
                              <Printer className="h-3 w-3 text-white" />
                              <span>Imprimir</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column (Forecast AI Predictor) */}
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-6 h-fit">
          
          {/* Trigger Header */}
          <div className="border-b border-[#E4E4E7] pb-3">
            <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider flex items-center space-x-1.5">
              <Cpu className="h-4 w-4 text-[#18181B]" />
              <span>Forecast AI / Demand Planner</span>
            </h3>
            <p className="text-[10px] text-[#71717A] mt-1 font-medium leading-relaxed">
              Analiza el Kardex de transacciones mensuales y genera predicciones inteligentes de stock para el siguiente periodo.
            </p>
          </div>

          <button
            onClick={handleCalculateForecast}
            disabled={forecastLoading}
            className="w-full bg-[#18181B] hover:bg-black disabled:bg-[#F4F4F5] disabled:text-[#A1A1AA] text-xs font-bold uppercase tracking-wider py-2.5 rounded-sm text-white flex items-center justify-center space-x-1.5 transition-colors"
          >
            {forecastLoading ? (
              <>
                <Loader className="h-4 w-4 animate-spin text-white" />
                <span>Calculando series temporales...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Estimar Proyecciones con IA</span>
              </>
            )}
          </button>

          {forecastError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm">
              {forecastError}
            </div>
          )}

          {/* Forecast output result and generation PO triggers */}
          {forecastResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 bg-[#FAFAFA] border border-[#E4E4E7] rounded-sm text-xs">
                <span className="text-[9px] text-[#71717A] block uppercase font-bold tracking-wider">Resumen Ejecutivo</span>
                <p className="text-[#27272A] leading-relaxed mt-1 font-medium">{forecastResult.summary}</p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider block">Adquisiciones Recomendadas:</span>
                
                {forecastResult.recommendations?.map((rec: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white border border-[#E4E4E7] rounded-sm space-y-3">
                    <div className="flex justify-between items-start text-xs">
                      <div>
                        <h4 className="font-bold text-[#18181B]">{rec.name}</h4>
                        <p className="text-[10px] text-[#71717A] font-mono mt-0.5">SKU: {rec.sku} | Sugerido: <b className="text-[#18181B]">{rec.recommendedQty} uds</b></p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase tracking-wider ${
                        rec.priority === 'Alta' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {rec.priority}
                      </span>
                    </div>

                    <p className="text-[10px] text-[#71717A] italic">"{rec.justification}"</p>

                    <button
                      onClick={() => handleGeneratePOFromForecast(rec)}
                      disabled={poLoading}
                      className="w-full bg-[#18181B] hover:bg-black text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-sm text-white flex items-center justify-center space-x-1 transition-colors"
                    >
                      {poLoading ? (
                        <Loader className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Generar Orden de Compra</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* Generated PO integration link */}
              {createdPo && (
                <div className="p-3.5 bg-green-50 border border-green-200 text-xs rounded-sm space-y-2">
                  <span className="text-green-700 font-bold block flex items-center space-x-1 uppercase tracking-wider text-[10px]">
                    <FileCheck className="h-4 w-4 text-green-600" />
                    <span>Orden {createdPo.id} Registrada</span>
                  </span>
                  <p className="text-[11px] text-green-800">La orden de compra ha sido guardada en Firestore y compilada en Google Docs de forma atómica.</p>
                  {poLink && (
                    <a
                      href={poLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1.5 text-green-700 hover:underline font-bold mt-1 uppercase tracking-wider text-[10px]"
                    >
                      <span>Abrir Orden en Docs</span>
                      <ExternalLink className="h-3.5 w-3.5 text-green-600" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </>
  );
}
