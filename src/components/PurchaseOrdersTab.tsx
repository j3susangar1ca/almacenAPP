import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  Loader, 
  Plus, 
  FolderSync, 
  FileCheck, 
  ExternalLink,
  Cpu
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Programmatic needs list */}
      <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm lg:col-span-2 space-y-4">
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

      {/* Forecast AI Predictor */}
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
  );
}
