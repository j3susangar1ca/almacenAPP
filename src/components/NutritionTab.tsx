import React, { useState } from 'react';
import { 
  Calendar, 
  Utensils, 
  Layers, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  Cpu, 
  TrendingDown, 
  Plus, 
  Scale, 
  CheckSquare,
  Loader
} from 'lucide-react';
import { MenuItem, Recipe, StockItem, UserRole } from '../types';

interface NutritionTabProps {
  menuItems: MenuItem[];
  recipes: Recipe[];
  stockItems: StockItem[];
  role: UserRole;
  userEmail: string;
  onAddMenu: (menu: MenuItem) => Promise<void>;
  onApproveMenu: (menuId: string, itemDeductions: Array<{ sku: string, qty: number }>) => Promise<{ success: boolean; msg: string }>;
}

export default function NutritionTab({
  menuItems,
  recipes,
  stockItems,
  onAddMenu,
  onApproveMenu
}: NutritionTabProps) {
  
  // Selection
  const [selectedMenuId, setSelectedMenuId] = useState<string>(menuItems[0]?.id || '');
  const activeMenu = menuItems.find(m => m.id === selectedMenuId);
  const activeRecipe = recipes.find(r => r.id === activeMenu?.recipeId) || recipes[0];

  // Form state for planning menu
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planDate, setPlanDate] = useState('2026-07-01');
  const [planType, setPlanType] = useState<'Desayuno' | 'Almuerzo' | 'Cena'>('Almuerzo');
  const [planRecipeId, setPlanRecipeId] = useState('REC-01');
  const [planServings, setPlanServings] = useState<number>(100);

  // AI substitution state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiError, setAiError] = useState('');

  // Status feedback states (replacing alert())
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Explosion results calculations
  let explosionList: Array<{
    sku: string;
    name: string;
    reqQty: number; // In grams or units
    unit: string;
    stockAvailable: number; // Converted from inventory units
    hasShortage: boolean;
    shortageQty: number;
  }> = [];

  if (activeMenu && activeRecipe) {
    activeRecipe.ingredients.forEach(ing => {
      // Find item in inventory
      const stockItem = stockItems.find(i => i.sku === ing.sku);
      const stockQtyGrams = stockItem 
        ? (stockItem.unit.includes('Sacos') ? stockItem.stockActual * 50000 
           : stockItem.unit.includes('Caja') ? stockItem.stockActual * 12000
           : stockItem.stockActual * 1000)
        : 0; // estimate conversion for BOM

      const reqTotalGrams = ing.qtyPerServing * activeMenu.servings;
      const hasShortage = stockQtyGrams < reqTotalGrams;
      
      explosionList.push({
        sku: ing.sku,
        name: ing.name,
        reqQty: reqTotalGrams,
        unit: 'g',
        stockAvailable: stockQtyGrams,
        hasShortage,
        shortageQty: hasShortage ? reqTotalGrams - stockQtyGrams : 0
      });
    });
  }

  // AI Sugerencias de sustitución
  const handleAISuggestions = async () => {
    if (!activeMenu || !activeRecipe) return;
    setAiLoading(true);
    setAiResult(null);
    setAiError('');

    try {
      const res = await fetch('/api/gemini/nutrition-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu: activeMenu,
          ingredients: activeRecipe.ingredients,
          stockItems
        })
      });
      const data = await res.json();
      if (data.error) {
        setAiError(data.error);
      } else {
        setAiResult(data);
      }
    } catch (err: any) {
      setAiError(err.message || 'Error invocando Nutrition AI.');
    } finally {
      setAiLoading(false);
    }
  };

  // Serve & Approve stock deduction
  const handleServeAndDeduct = async () => {
    if (!activeMenu) return;
    setActionSuccess('');
    setActionError('');
    
    // Convert grams back to standard stocking units
    const itemDeductions = explosionList.map(item => {
      const stockItem = stockItems.find(i => i.sku === item.sku);
      let qtyDeduct = 0;
      if (stockItem) {
        qtyDeduct = stockItem.unit.includes('Sacos') ? item.reqQty / 50000
                  : stockItem.unit.includes('Caja') ? item.reqQty / 12000
                  : item.reqQty / 1000;
      }
      return {
        sku: item.sku,
        qty: parseFloat(qtyDeduct.toFixed(2))
      };
    });

    const result = await onApproveMenu(activeMenu.id, itemDeductions);
    if (result.success) {
      setActionSuccess('¡Menú aprobado y servido! El stock ha sido deducido de manera atómica con Kardex.');
    } else {
      setActionError(`Error al descontar stock: ${result.msg}`);
    }
  };

  // Plan Menu submit
  const handlePlanMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    const rec = recipes.find(r => r.id === planRecipeId);
    if (!rec) return;

    const newMenu: MenuItem = {
      id: `MNU-0${menuItems.length + 1}`,
      date: planDate,
      type: planType,
      recipeId: planRecipeId,
      recipeName: rec.name,
      servings: planServings,
      status: 'Programado'
    };

    await onAddMenu(newMenu);
    setSelectedMenuId(newMenu.id);
    setShowPlanForm(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Calendar Plan Menu Scheduler */}
      <div className="bg-white border border-[#E4E4E7] p-4 rounded-sm space-y-4 h-fit">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">Cronograma de Menús</h3>
          <button
            onClick={() => setShowPlanForm(true)}
            className="text-[10px] bg-[#18181B] hover:bg-black text-white font-bold uppercase tracking-wider py-1 px-2.5 rounded-sm flex items-center space-x-1 transition-colors"
          >
            <Plus className="h-3 w-3" />
            <span>Planificar Día</span>
          </button>
        </div>

        {/* Schedule list */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {menuItems.map(m => {
            const isSelected = m.id === selectedMenuId;
            return (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedMenuId(m.id);
                  setAiResult(null);
                  setActionSuccess('');
                  setActionError('');
                }}
                className={`p-3.5 rounded-sm border cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-[#FAFAFA] border-[#18181B] text-[#18181B]' 
                    : 'bg-white border-[#E4E4E7] text-[#71717A] hover:border-[#18181B]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-[#71717A] font-bold">{m.date}</span>
                  <span className={`px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase tracking-wider ${
                    m.status === 'Programado' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {m.status}
                  </span>
                </div>
                <h4 className="font-bold text-xs mt-2 text-[#18181B]">{m.recipeName}</h4>
                <div className="flex justify-between items-center mt-2.5 text-[10px] text-[#71717A] font-mono font-bold uppercase">
                  <span className="bg-[#F4F4F5] text-[#18181B] border border-[#E4E4E7] px-1.5 py-0.5 rounded-sm">{m.type}</span>
                  <span>Raciones: {m.servings}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explosion & AI Sugerencias */}
      <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm lg:col-span-2 space-y-6">
        {activeMenu ? (
          <>
            {/* Success and Error messages */}
            {actionSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-sm flex items-start space-x-2 animate-in fade-in duration-200">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm flex items-start space-x-2 animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Active Plan Detail */}
            <div className="flex justify-between items-start border-b border-[#E4E4E7] pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#71717A] font-bold">{activeMenu.id} | Plan Nutricional</span>
                <h2 className="text-sm font-bold text-[#18181B] uppercase tracking-tight mt-0.5">{activeMenu.recipeName}</h2>
                <p className="text-xs text-[#71717A] mt-1">Servicios programados: <b className="text-[#18181B]">{activeMenu.servings} raciones</b></p>
              </div>

              {activeMenu.status === 'Programado' && (
                <button
                  onClick={handleServeAndDeduct}
                  className="bg-[#18181B] hover:bg-black text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm text-white transition-colors flex items-center space-x-1"
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>Servir y Descontar Stock</span>
                </button>
              )}
            </div>

            {/* BOM Formula & Explosion Engine */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Formula BOM details */}
              <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-4 rounded-sm space-y-3">
                <h3 className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="h-4 w-4 text-[#18181B]" />
                  <span>Receta Base (Ficha Técnica)</span>
                </h3>
                <p className="text-[11px] text-[#71717A] italic">"{activeRecipe?.description || 'Receta para comedores'}"</p>
                <div className="space-y-1">
                  {activeRecipe?.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-mono border-t border-[#E4E4E7] py-2 first:border-0 first:pt-0 text-[#18181B]">
                      <span className="font-medium">{ing.name}</span>
                      <span className="text-[#71717A]">{ing.qtyPerServing} {ing.unit} / porción</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explosion Output */}
              <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-4 rounded-sm space-y-3">
                <h3 className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider flex items-center space-x-1.5">
                  <Scale className="h-4 w-4 text-[#18181B]" />
                  <span>Explosión de Insumos y Faltantes</span>
                </h3>

                <div className="space-y-2">
                  {explosionList.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-sm space-y-1 border border-[#E4E4E7]">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#18181B]">{item.name}</span>
                        {item.hasShortage ? (
                          <span className="text-[8px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider font-mono">
                            Déficit
                          </span>
                        ) : (
                          <span className="text-[8px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider font-mono">
                            Suficiente
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-[10px] text-[#71717A] font-mono">
                        <span>Requerido: {(item.reqQty / 1000).toFixed(2)} kg</span>
                        <span>Disponible: {(item.stockAvailable / 1000).toFixed(2)} kg</span>
                      </div>
                      {item.hasShortage && (
                        <p className="text-[10px] text-red-600 font-mono font-bold mt-0.5">Faltante: {(item.shortageQty / 1000).toFixed(2)} kg</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Nutrition AI - Gemini substitution */}
            <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-4 rounded-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <h3 className="text-[10px] font-bold text-[#18181B] flex items-center space-x-1.5 uppercase tracking-wider">
                    <Cpu className="h-4 w-4" />
                    <span>Nutrition AI (Gemini Expert)</span>
                  </h3>
                  <p className="text-[10px] text-[#71717A] mt-0.5 font-medium">Sugerencias macro-nutricionales y reemplazos inteligentes por stock</p>
                </div>

                <button
                  onClick={handleAISuggestions}
                  disabled={aiLoading}
                  className="bg-[#18181B] hover:bg-black disabled:bg-[#F4F4F5] text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm text-white flex items-center space-x-1 transition-colors self-start"
                >
                  {aiLoading ? (
                    <>
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                      <span>Analizando menú...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Optimizar Menú con IA</span>
                    </>
                  )}
                </button>
              </div>

              {aiError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm">
                  {aiError}
                </div>
              )}

              {aiResult && (
                <div className="space-y-4 text-xs leading-relaxed">
                  <div className="p-3 bg-white border border-[#E4E4E7] rounded-sm text-[#27272A]">
                    <h4 className="font-bold text-[#18181B] mb-1 uppercase tracking-wider text-[10px]">Evaluación de Balance Macro-Nutricional</h4>
                    <p>{aiResult.nutritionalEvaluation}</p>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-sm">
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center space-x-1.5 uppercase tracking-wider text-[10px]">
                      <TrendingDown className="h-4 w-4" />
                      <span>Sustituciones Inteligentes (Sugerencias)</span>
                    </h4>
                    <div className="space-y-2">
                      {aiResult.substitutions?.map((sub: any, idx: number) => (
                        <div key={idx} className="border-t border-blue-100 pt-2 first:border-0 first:pt-0">
                          <span className="font-bold text-blue-900 text-[11px]">{sub.originalIngredient} → <span className="text-blue-700 underline">{sub.suggestedSubstitute}</span></span>
                          <p className="text-blue-800 text-[10px] mt-0.5">{sub.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-[#E4E4E7] rounded-sm text-[#27272A]">
                    <h4 className="font-bold text-[#18181B] mb-1 uppercase tracking-wider text-[10px]">Almacenamiento Higiénico & Seguridad</h4>
                    <p>{aiResult.hygieneAdvice}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center p-12 text-[#71717A] font-medium text-xs">
            No se registran menús planificados para el mes. Use "Planificar Día" para iniciar la programación.
          </div>
        )}
      </div>

      {/* Plan Menu Modal */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 bg-[#18181B]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E4E7] rounded-sm w-full max-w-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E4E4E7] flex justify-between items-center bg-[#FAFAFA]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-1.5">
                <Utensils className="h-4 w-4 text-[#18181B]" />
                <span>Planificar Día y Menú Institucional</span>
              </h3>
              <button onClick={() => setShowPlanForm(false)} className="text-[#71717A] hover:text-[#18181B] font-bold">✕</button>
            </div>

            <form onSubmit={handlePlanMenu} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#71717A] font-bold uppercase tracking-wider">Fecha de Servicio</label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="bg-white border border-[#E4E4E7] rounded-sm p-2.5 w-full text-[#18181B] focus:outline-none focus:border-[#18181B]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[#71717A] font-bold uppercase tracking-wider">Tipo de Menú</label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value as any)}
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2.5 w-full text-[#18181B] focus:outline-none"
                  >
                    <option value="Desayuno">Desayuno</option>
                    <option value="Almuerzo">Almuerzo</option>
                    <option value="Cena">Cena</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#71717A] font-bold uppercase tracking-wider">Número de raciones</label>
                  <input
                    type="number"
                    value={planServings === 0 ? '' : planServings}
                    onChange={(e) => setPlanServings(Number(e.target.value))}
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2.5 w-full text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#71717A] font-bold uppercase tracking-wider">Receta Autorizada (BOM)</label>
                <select
                  value={planRecipeId}
                  onChange={(e) => setPlanRecipeId(e.target.value)}
                  className="bg-white border border-[#E4E4E7] rounded-sm p-2.5 w-full text-[#18181B] focus:outline-none"
                  required
                >
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setShowPlanForm(false)}
                  className="bg-white border border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5] px-4 py-2 rounded-sm font-bold uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#18181B] hover:bg-black text-white px-5 py-2 rounded-sm font-bold uppercase tracking-wider transition-colors"
                >
                  Programar Menú
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
