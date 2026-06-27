import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Minus, 
  History, 
  ScanLine, 
  FileCheck, 
  ArrowRightLeft, 
  Search, 
  Filter, 
  ChevronRight,
  AlertCircle,
  Loader,
  User as UserIcon
} from 'lucide-react';
import { 
  StockItem, 
  StockTransaction, 
  Warehouse, 
  UserRole
} from '../types';

interface InventoryTabProps {
  items: StockItem[];
  transactions: StockTransaction[];
  activeWarehouse: Warehouse;
  role: UserRole;
  userEmail: string;
  onExecuteMovement: (
    itemId: string,
    type: 'IN' | 'OUT',
    qty: number,
    details: string
  ) => Promise<{ success: boolean; msg: string }>;
  onAddItem: (item: Partial<StockItem>) => Promise<void>;
  onTriggerSyncSheets: () => Promise<void>;
}

export default function InventoryTab({
  items,
  transactions,
  activeWarehouse,
  role,
  onExecuteMovement,
  onTriggerSyncSheets
}: InventoryTabProps) {
  
  // State for search and filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // State for Stepper Movement Form
  const [formOpen, setFormOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState<number>(0);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter items based on active Warehouse and filters
  const filteredItems = items.filter(item => {
    const matchesWarehouse = item.warehouseId === activeWarehouse.id;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesWarehouse && matchesSearch && matchesCategory;
  });

  // Filter Transactions for active warehouse
  const filteredTransactions = transactions
    .filter(t => t.warehouseId === activeWarehouse.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Handle OCR receipt uploading
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrResult(null);
    setFormError('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        try {
          const res = await fetch('/api/gemini/ocr-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64String })
          });
          const data = await res.json();
          
          if (data.items && data.items.length > 0) {
            setOcrResult(data);
            const parsedItem = data.items[0];
            const matchedItem = items.find(i => i.sku === parsedItem.sku || i.name.toLowerCase().includes(parsedItem.name.toLowerCase()));
            
            if (matchedItem) {
              setSelectedItemId(matchedItem.id);
            }
            setMovementType('IN');
            setQuantity(parsedItem.quantity || 1);
            setDetails(`Entrada automatizada OCR - Factura N° ${data.invoiceNumber || ''} de ${data.supplierName || ''}`);
            setStep(2);
            setFormOpen(true);
          } else {
            setFormError('No se pudieron extraer ítems de la factura. Intente con otra imagen.');
          }
        } catch (err: any) {
          console.error(err);
          setFormError('Error al invocar el Agente OCR de Gemini.');
        } finally {
          setOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setOcrLoading(false);
      setFormError('Error de lectura de archivo.');
    }
  };

  // Submit Inventory Movement
  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (role === 'Auditor') {
      setFormError('Los Auditores están restringidos a consultas de "Solo Lectura".');
      return;
    }

    if (!selectedItemId) {
      setFormError('Por favor seleccione un artículo.');
      return;
    }
    if (quantity <= 0) {
      setFormError('La cantidad debe ser mayor a 0.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await onExecuteMovement(selectedItemId, movementType, quantity, details);
      if (result.success) {
        setFormOpen(false);
        setStep(1);
        setSelectedItemId('');
        setQuantity(0);
        setDetails('');
        setOcrResult(null);
      } else {
        setFormError(result.msg);
      }
    } catch (err: any) {
      setFormError(err.message || 'Falla al procesar el movimiento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper controls & filter bar */}
      <div className="bg-white border border-[#E4E4E7] p-4 rounded-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
          
          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#71717A]" />
            <input
              type="text"
              placeholder="Buscar por Nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-[#E4E4E7] rounded-sm pl-9 pr-4 py-2 text-xs text-[#18181B] w-full focus:outline-none focus:border-[#18181B] transition-colors placeholder-[#A1A1AA]"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <Filter className="h-3.5 w-3.5 text-[#71717A]" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-[#E4E4E7] text-xs text-[#18181B] py-2 px-3 rounded-sm focus:outline-none focus:border-[#18181B] w-full md:w-auto transition-colors"
            >
              <option value="all">Todas las Categorías</option>
              <option value="Perecederos">Perecederos</option>
              <option value="No Perecederos">No Perecederos</option>
              <option value="Refrigerados">Refrigerados</option>
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          
          {/* Export Sheet */}
          <button
            onClick={onTriggerSyncSheets}
            className="bg-white hover:bg-[#F4F4F5] text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm text-[#18181B] border border-[#E4E4E7] transition-colors flex items-center space-x-1.5"
          >
            <span>Espejo Google Sheets</span>
          </button>

          {/* OCR Factura Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={ocrLoading}
            className="bg-white hover:bg-[#F4F4F5] disabled:bg-[#F4F4F5] text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm text-[#18181B] border border-[#E4E4E7] transition-all flex items-center space-x-1.5"
          >
            {ocrLoading ? (
              <>
                <Loader className="h-3.5 w-3.5 animate-spin" />
                <span>Extrayendo OCR...</span>
              </>
            ) : (
              <>
                <ScanLine className="h-3.5 w-3.5" />
                <span>Factura OCR (Gemini AI)</span>
              </>
            )}
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Manual Movement Stepper Form */}
          <button
            onClick={() => {
              setStep(1);
              setFormError('');
              setFormOpen(true);
            }}
            className="bg-[#18181B] hover:bg-black text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm text-white transition-colors flex items-center space-x-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Registrar Movimiento</span>
          </button>

        </div>
      </div>

      {/* Main Grid: Stock items and History Kardex */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Physical Stock Table (Modulo B) */}
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-lg xl:col-span-2 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] mb-4 flex items-center space-x-1.5">
            <ArrowRightLeft className="h-4 w-4 text-[#18181B]" />
            <span>Existencias Físicas en {activeWarehouse.name}</span>
          </h3>

          <div className="overflow-x-auto border border-[#E4E4E7] rounded-lg">
            <table className="w-full text-left text-xs text-[#18181B]">
              <thead className="bg-[#FAFAFA] text-[#71717A] text-[10px] uppercase font-bold tracking-wider border-b border-[#E4E4E7]">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Artículo</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3 text-right">Costo Unitario</th>
                  <th className="p-3 text-right">Stock Actual</th>
                  <th className="p-3">Lote & Vence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F5] bg-white">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#71717A] font-medium">
                      No se encontraron artículos catalogados para este almacén o búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const isLow = item.stockActual <= item.stockMinimo;
                    return (
                      <tr key={item.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="p-3 font-mono text-xs font-bold text-[#18181B] tabular-numbers">{item.sku}</td>
                        <td className="p-3">
                          <div className="font-bold text-[#18181B]">{item.name}</div>
                          <div className="text-[10px] text-[#71717A] font-mono mt-0.5">{item.unit}</div>
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                            item.category === 'Perecederos' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            item.category === 'Refrigerados' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-zinc-100 text-zinc-700 border border-zinc-200'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-medium tabular-numbers">S/. {item.unitCost.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <div className={`font-bold font-mono tabular-numbers ${isLow ? 'text-red-600 animate-pulse' : 'text-[#18181B]'}`}>
                            {item.stockActual}
                          </div>
                          {isLow && (
                            <span className="inline-block text-[8px] bg-red-50 text-red-600 border border-red-200 px-1 py-0.5 rounded-md font-bold uppercase mt-1">
                              Stock Crítico
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-mono text-[10px] text-[#18181B]">Lote: {item.batchCode || 'N/A'}</div>
                          <div className="text-[9px] text-[#71717A] font-mono mt-0.5">Vence: {item.expirationDate || 'N/A'}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transaction History (Kardex View) */}
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-lg shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] mb-4 flex items-center space-x-1.5">
            <History className="h-4 w-4 text-[#18181B]" />
            <span>Kardex Físico e Historial</span>
          </h3>

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {filteredTransactions.length === 0 ? (
              <div className="text-center p-8 text-[#71717A] text-xs font-medium">
                No se registran movimientos de stock para este almacén.
              </div>
            ) : (
              filteredTransactions.map(t => (
                <div key={t.id} className="p-3 bg-white border border-[#E4E4E7] rounded-lg text-xs space-y-2 shadow-2xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                        t.type === 'IN' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {t.type === 'IN' ? <Plus className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                        <span>{t.type === 'IN' ? 'Entrada' : 'Salida'}</span>
                      </span>
                      <h4 className="font-bold text-[#18181B] mt-1.5">{t.itemName}</h4>
                      <p className="text-[10px] text-[#71717A] font-mono">SKU: <span className="tabular-numbers">{t.sku}</span> | Cantidad: <span className="tabular-numbers font-bold text-[#18181B]">{t.quantity}</span></p>
                    </div>
                    <span className="text-[9px] text-[#71717A] font-mono">{new Date(t.timestamp).toLocaleDateString()}</span>
                  </div>

                  <p className="text-[11px] text-[#27272A] italic">"{t.details}"</p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A] border-t border-[#F4F4F5] pt-1.5">
                    <div className="flex items-center space-x-1">
                      <UserIcon className="h-3 w-3 text-[#A1A1AA]" />
                      <span className="truncate max-w-[100px] font-medium">{t.userName}</span>
                      <span className="text-[8px] bg-[#F4F4F5] text-[#18181B] px-1.5 py-0.2 rounded-md border border-[#E4E4E7] font-bold uppercase tracking-wider">{t.userRole}</span>
                    </div>
                    <div>
                      <span>Diff: </span>
                      <span className="text-[#71717A] tabular-numbers">{t.previousQty}</span>
                      <span className="mx-1 text-[#A1A1AA]">→</span>
                      <span className="text-[#18181B] font-bold tabular-numbers">{t.newQty}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Movement Registrar Modal & Stepper Form */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-[#18181B]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E4E7] rounded-sm w-full max-w-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b border-[#E4E4E7] flex justify-between items-center bg-[#FAFAFA]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-1.5">
                  <ArrowRightLeft className="h-4 w-4 text-[#18181B]" />
                  <span>Registrar Movimiento de Inventario</span>
                </h3>
                <p className="text-[10px] text-[#71717A] font-mono mt-0.5">Almacén: {activeWarehouse.name}</p>
              </div>
              <button 
                onClick={() => setFormOpen(false)}
                className="text-[#71717A] hover:text-[#18181B] font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Stepper Header */}
            <div className="bg-[#F4F4F5] px-5 py-2.5 border-b border-[#E4E4E7] flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
              <span className={step === 1 ? 'text-[#18181B] font-bold' : 'text-[#71717A]'}>1. Definir Cantidad</span>
              <ChevronRight className="h-3 w-3 text-[#A1A1AA]" />
              <span className={step === 2 ? 'text-[#18181B] font-bold' : 'text-[#71717A]'}>2. Justificación & Lote</span>
            </div>

            <form onSubmit={handleSubmitMovement} className="p-5 space-y-4">
              
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* OCR Pre-fill notification */}
              {ocrResult && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-sm flex items-start space-x-2">
                  <FileCheck className="h-4 w-4 shrink-0 text-blue-600" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[10px]">OCR Extracción Completa</span>
                    <span className="text-[11px] block mt-0.5">Proveedor: {ocrResult.supplierName}</span>
                    <span className="text-[11px] block">Monto Total: S/. {ocrResult.totalAmount}</span>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  {/* Select Stock Item */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#71717A]">Seleccionar Artículo Maestro</label>
                    <select
                      value={selectedItemId}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                      className="bg-white border border-[#E4E4E7] text-xs text-[#18181B] rounded-sm p-2.5 w-full focus:outline-none focus:border-[#18181B] transition-colors"
                      required
                    >
                      <option value="">-- Elija un artículo --</option>
                      {items.filter(i => i.warehouseId === activeWarehouse.id).map(i => (
                        <option key={i.id} value={i.id}>
                          {i.sku} - {i.name} ({i.unit}) [Stock: {i.stockActual}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direction of movement */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMovementType('IN')}
                      className={`p-3 rounded-sm border text-center flex flex-col items-center justify-center space-y-1 transition-all ${
                        movementType === 'IN' 
                          ? 'bg-green-50 border-green-300 text-green-700 font-bold' 
                          : 'bg-white border-[#E4E4E7] text-[#71717A] hover:bg-[#FAFAFA]'
                      }`}
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Entrada (IN)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovementType('OUT')}
                      className={`p-3 rounded-sm border text-center flex flex-col items-center justify-center space-y-1 transition-all ${
                        movementType === 'OUT' 
                          ? 'bg-red-50 border-red-300 text-red-700 font-bold' 
                          : 'bg-white border-[#E4E4E7] text-[#71717A] hover:bg-[#FAFAFA]'
                      }`}
                    >
                      <Minus className="h-5 w-5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Salida (OUT)</span>
                    </button>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#71717A]">Cantidad física del movimiento</label>
                    <input
                      type="number"
                      value={quantity === 0 ? '' : quantity}
                      onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                      placeholder="Ingrese cantidad..."
                      className="bg-white border border-[#E4E4E7] text-xs text-[#18181B] rounded-sm p-2.5 w-full focus:outline-none focus:border-[#18181B] transition-colors"
                      required
                    />
                  </div>

                  {/* Footer buttons for step 1 */}
                  <div className="flex justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!selectedItemId || quantity <= 0}
                      className="bg-[#18181B] hover:bg-black disabled:bg-[#FAFAFA] disabled:text-[#A1A1AA] disabled:border-[#E4E4E7] border border-transparent text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-sm text-white transition-colors flex items-center space-x-1.5"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  {/* Selected Item Summary */}
                  <div className="p-3 bg-[#FAFAFA] border border-[#E4E4E7] rounded-sm text-xs flex justify-between font-mono">
                    <div>
                      <span className="text-[#71717A] block text-[9px] uppercase font-sans font-bold tracking-wider">Artículo</span>
                      <span className="text-[#18181B] font-bold">{items.find(i => i.id === selectedItemId)?.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#71717A] block text-[9px] uppercase font-sans font-bold tracking-wider">Movimiento</span>
                      <span className={movementType === 'IN' ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                        {movementType === 'IN' ? '+' : '-'}{quantity}
                      </span>
                    </div>
                  </div>

                  {/* Details / Justification */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#71717A]">Justificación Legal / Detalle de Auditoría</label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="E.g. Ingreso por compra aprobada, salida por distribución a Comedor Central..."
                      rows={3}
                      className="bg-white border border-[#E4E4E7] text-xs text-[#18181B] rounded-sm p-2.5 w-full focus:outline-none focus:border-[#18181B] transition-colors"
                      required
                    ></textarea>
                  </div>

                  {/* Footer actions for step 2 */}
                  <div className="flex justify-between pt-3 border-t border-[#E4E4E7]">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="bg-white hover:bg-[#F4F4F5] text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm text-[#18181B] border border-[#E4E4E7] transition-colors"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !details}
                      className="bg-[#18181B] hover:bg-black disabled:bg-[#FAFAFA] disabled:text-[#A1A1AA] text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-sm text-white transition-colors flex items-center space-x-1"
                    >
                      {submitting && <Loader className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                      <span>Registrar Movimiento Atómico</span>
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
