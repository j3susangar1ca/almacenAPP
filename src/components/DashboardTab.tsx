import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Coins, 
  Calendar, 
  Activity, 
  ArrowUpRight, 
  FileText,
  Warehouse
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { StockItem, Budget, StockTransaction, Tender, MenuItem } from '../types';

interface DashboardTabProps {
  items: StockItem[];
  budgets: Budget[];
  transactions: StockTransaction[];
  tenders: Tender[];
  menuItems: MenuItem[];
  onNavigateToTab: (tabId: string) => void;
}

export default function DashboardTab({
  items,
  budgets,
  transactions,
  tenders,
  menuItems,
  onNavigateToTab
}: DashboardTabProps) {
  
  // Calculations
  const totalItemsCount = items.length;
  
  // Critical Low Stock Levels (stock_actual <= stock_minimo)
  const criticalItems = items.filter(item => item.stockActual <= item.stockMinimo);
  const criticalCount = criticalItems.length;

  // Total valuation calculation
  const totalValuation = items.reduce((sum, item) => sum + (item.stockActual * item.unitCost), 0);

  // Total active tenders
  const activeTendersCount = tenders.filter(t => t.status === 'Publicada' || t.status === 'Evaluación').length;

  // Total budget execution
  const mainBudget = budgets.find(b => b.code === 'P-101') || budgets[0];
  const budgetUtilizationRate = mainBudget 
    ? ((mainBudget.committedAmount + mainBudget.executedAmount) / mainBudget.allocatedAmount) * 100 
    : 0;

  // Next week's menus
  const plannedMenusCount = menuItems.filter(m => m.status === 'Programado').length;

  // Expiring soon alerts (e.g. next 60 days)
  const today = new Date();
  const expiringBatches = items.filter(item => {
    if (!item.expirationDate) return false;
    const expDate = new Date(item.expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 60;
  });

  // Trend Data of Transactions (Inputs/IN vs Outputs/OUT of last weeks)
  const trendData = [
    { name: 'Ene', Entradas: 120, Salidas: 90 },
    { name: 'Feb', Entradas: 150, Salidas: 110 },
    { name: 'Mar', Entradas: 180, Salidas: 140 },
    { name: 'Abr', Entradas: 220, Salidas: 190 },
    { name: 'May', Entradas: 280, Salidas: 240 },
    { name: 'Jun', Entradas: 310, Salidas: 270 }
  ];

  return (
    <div className="space-y-6">
      
      {/* Upper KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* KPI 1: Inventory Valuation */}
        <div className="bg-white border border-[#E4E4E7] p-4 rounded-lg flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center text-[#71717A]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Valor Inventario</span>
            <Coins className="h-4 w-4 text-[#18181B]" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-[#18181B] tabular-numbers">S/. {totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <div className="text-[10px] text-green-600 flex items-center space-x-1 mt-1 font-bold uppercase">
              <TrendingUp className="h-3 w-3" />
              <span>+4.2% este mes</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Items */}
        <div className="bg-white border border-[#E4E4E7] p-4 rounded-lg flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center text-[#71717A]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Artículos</span>
            <Warehouse className="h-4 w-4 text-[#18181B]" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-[#18181B] tabular-numbers">{totalItemsCount}</span>
            <p className="text-[10px] text-[#A1A1AA] mt-1 font-bold uppercase">Maestro catalogado</p>
          </div>
        </div>

        {/* KPI 3: Stock Alertas */}
        <div className={`bg-white border p-4 rounded-lg flex flex-col justify-between transition-colors shadow-xs ${
          criticalCount > 0 
            ? 'border-red-200 bg-red-50/10' 
            : 'border-[#E4E4E7]'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A]">Bajo Mínimo</span>
            <AlertTriangle className={`h-4 w-4 ${criticalCount > 0 ? 'text-red-600 animate-pulse' : 'text-[#71717A]'}`} />
          </div>
          <div className="mt-2">
            <span className={`text-xl font-bold tabular-numbers ${criticalCount > 0 ? 'text-red-600' : 'text-[#18181B]'}`}>{criticalCount}</span>
            <p className="text-[10px] text-[#A1A1AA] mt-1 font-bold uppercase">Artículos ≤ stock mín.</p>
          </div>
        </div>

        {/* KPI 4: Licitaciones Activas */}
        <div className="bg-white border border-[#E4E4E7] p-4 rounded-lg flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center text-[#71717A]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Licitaciones Activas</span>
            <FileText className="h-4 w-4 text-[#18181B]" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-[#18181B] tabular-numbers">{activeTendersCount}</span>
            <p className="text-[10px] text-[#A1A1AA] mt-1 font-bold uppercase">En pliegos y evaluación</p>
          </div>
        </div>

        {/* KPI 5: Presupuesto Ejecutado */}
        <div className="bg-white border border-[#E4E4E7] p-4 rounded-lg flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center text-[#71717A]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Ejecución Presupuesto</span>
            <Activity className="h-4 w-4 text-[#18181B]" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-[#18181B] tabular-numbers">{budgetUtilizationRate.toFixed(1)}%</span>
            <div className="w-full bg-[#F4F4F5] h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetUtilizationRate > 90 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600' 
                    : budgetUtilizationRate > 70 
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500' 
                    : 'bg-gradient-to-r from-zinc-400 to-zinc-600'
                }`}
                style={{ width: `${Math.min(budgetUtilizationRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* KPI 6: Menús Programados */}
        <div className="bg-white border border-[#E4E4E7] p-4 rounded-lg flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center text-[#71717A]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Menús Activos</span>
            <Calendar className="h-4 w-4 text-[#18181B]" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-[#18181B] tabular-numbers">{plannedMenusCount}</span>
            <p className="text-[10px] text-[#A1A1AA] mt-1 font-bold uppercase">Programados para el mes</p>
          </div>
        </div>

      </div>

      {/* Main Analytical Section (Gráficos) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart (Recharts) */}
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#F4F4F5]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-1.5">
                <Activity className="h-4 w-4 text-[#18181B]" />
                <span>Flujo de Movimiento de Víveres (Semestral)</span>
              </h3>
              <p className="text-[10px] text-[#71717A]">Métricas consolidadas de Entradas vs Salidas del Kardex</p>
            </div>
            <span className="text-[9px] bg-[#F4F4F5] text-[#18181B] px-2 py-0.5 rounded-sm font-bold uppercase font-mono">Actualizado</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181B" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#18181B" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717A" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#71717A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis dataKey="name" stroke="#71717A" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717A" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E4E4E7', borderRadius: '2px', fontSize: '11px' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="Entradas" stroke="#18181B" strokeWidth={2} fillOpacity={1} fill="url(#colorIn)" />
                <Area type="monotone" dataKey="Salidas" stroke="#71717A" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget execution details breakdown */}
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-lg shadow-xs">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#F4F4F5]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-1.5">
              <Coins className="h-4 w-4 text-[#18181B]" />
              <span>Ejecución Presupuestaria de Fondos</span>
            </h3>
            <span className="text-[9px] text-green-700 bg-green-50 px-2 py-0.5 border border-green-200 font-bold uppercase rounded-full">Partidas Activas</span>
          </div>

          <div className="space-y-4">
            {budgets.map(b => {
              const utilized = b.committedAmount + b.executedAmount;
              const rate = (utilized / b.allocatedAmount) * 100;
              return (
                <div key={b.id} className="p-4 bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg shadow-2xs">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="text-[10px] font-bold text-[#71717A] font-mono">{b.code}</span>
                      <h4 className="text-xs text-[#18181B] truncate font-bold">{b.name}</h4>
                    </div>
                    <span className="text-[10px] text-[#18181B] font-bold font-mono tabular-numbers">{rate.toFixed(1)}%</span>
                  </div>

                  <div className="w-full bg-[#E4E4E7] h-2 rounded-full my-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        rate > 90 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600' 
                          : rate > 70 
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500' 
                          : 'bg-gradient-to-r from-zinc-400 to-zinc-600'
                      }`} 
                      style={{ width: `${Math.min(rate, 100)}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[9px] text-[#71717A] font-mono mt-2 border-t border-[#E4E4E7] pt-2">
                    <div>
                      <span className="block text-[8px] text-[#A1A1AA] font-sans font-bold uppercase">Asignado</span>
                      <span className="text-[#18181B] font-medium tabular-numbers">S/. {b.allocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-[#A1A1AA] font-sans font-bold uppercase">Comprometido</span>
                      <span className="text-amber-700 font-medium tabular-numbers">S/. {utilized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] text-[#A1A1AA] font-sans font-bold uppercase">Disponible</span>
                      <span className="text-[#18181B] font-bold tabular-numbers">S/. {b.availableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Critical Stock alerts table & Expiration lot alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Alerts table (stock_actual <= stock_minimo) */}
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#F4F4F5]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-1.5">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>Víveres en Nivel Crítico de Desabastecimiento</span>
            </h3>
            <button 
              onClick={() => onNavigateToTab('inventory')}
              className="text-[10px] font-bold uppercase tracking-widest text-[#18181B] border border-[#18181B] px-3 py-1 hover:bg-[#18181B] hover:text-white transition-all flex items-center"
            >
              Ir a inventario <ArrowUpRight className="h-3 w-3 ml-0.5" />
            </button>
          </div>

          {criticalCount === 0 ? (
            <div className="p-8 text-center text-[#71717A] text-xs">
              ✅ Todos los artículos se encuentran por encima del stock mínimo de seguridad.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#E4E4E7] rounded-none">
              <table className="w-full text-left text-xs text-[#18181B]">
                <thead className="bg-[#FAFAFA] text-[#71717A] text-[10px] uppercase font-bold border-b border-[#E4E4E7]">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Artículo</th>
                    <th className="p-3 text-right">Stock Actual</th>
                    <th className="p-3 text-right">Mínimo</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5] bg-white">
                  {criticalItems.map(item => (
                    <tr key={item.id} className="hover:bg-[#F9FAFB]">
                      <td className="p-3 font-mono text-[#71717A]">{item.sku}</td>
                      <td className="p-3 font-semibold text-[#18181B]">{item.name}</td>
                      <td className="p-3 text-right font-mono font-bold text-red-600">{item.stockActual}</td>
                      <td className="p-3 text-right font-mono text-[#71717A]">{item.stockMinimo}</td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                          Crítico
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expiration lot alerts */}
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#F4F4F5]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-1.5">
              <Calendar className="h-4 w-4 text-[#18181B]" />
              <span>Alertas de Vencimiento de Lotes (Próximos 60 días)</span>
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold uppercase">
              Foco Trazabilidad
            </span>
          </div>

          {expiringBatches.length === 0 ? (
            <div className="p-8 text-center text-[#71717A] text-xs">
              🛡️ No se registran lotes próximos a vencer en los siguientes 60 días.
            </div>
          ) : (
            <div className="space-y-2">
              {expiringBatches.map(item => {
                const diffTime = new Date(item.expirationDate).getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return (
                  <div key={item.id} className="p-3 bg-[#FAFAFA] border border-[#E4E4E7] rounded-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-[#18181B]">{item.name}</span>
                        <span className="text-[10px] font-mono bg-white text-[#71717A] px-1.5 py-0.5 rounded-sm border border-[#E4E4E7]">Lote: {item.batchCode}</span>
                      </div>
                      <p className="text-[10px] text-[#71717A] font-mono mt-0.5">Vence: {item.expirationDate} | Almacén: {item.warehouseId === 'W-01' ? 'Seco' : 'Frigorífico'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold font-mono ${
                        diffDays <= 15 ? 'bg-red-50 text-red-700 border border-red-200' :
                        diffDays <= 30 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-zinc-100 text-zinc-700 border border-zinc-200'
                      }`}>
                        {diffDays} días
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
