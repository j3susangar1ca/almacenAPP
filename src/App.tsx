import React, { useState, useEffect } from 'react';
import { firestoreAdapter } from './core/infrastructure/persistence/FirestoreAdapter';
import { 
  signInWithGoogle, 
  logoutUser, 
  onAuthStateChange 
} from './lib/firebase';
import { 
  StockItem, 
  Budget, 
  StockTransaction, 
  Tender, 
  Bid, 
  MenuItem, 
  StaffMember, 
  Vehicle, 
  Equipment, 
  MonthlyProgramItem, 
  PurchaseOrder,
  Warehouse,
  UserRole
} from './types';
import Navbar from './components/Navbar';
import DashboardTab from './components/DashboardTab';
import InventoryTab from './components/InventoryTab';
import ProcurementTab from './components/ProcurementTab';
import NutritionTab from './components/NutritionTab';
import ResourcesTab from './components/ResourcesTab';
import PurchaseOrdersTab from './components/PurchaseOrdersTab';
import SkeletonLoader from './components/SkeletonLoader';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader, 
  Lock, 
  Database, 
  UserCheck, 
  Terminal, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Warehouse as WarehouseIcon,
  Globe
} from 'lucide-react';

const WAREHOUSES: Warehouse[] = [
  { id: 'W-01', name: 'Almacén Central (Secos)', location: 'Av. Metropolitana 450, Lima' },
  { id: 'W-02', name: 'Cámara Frigorífica (Congelados)', location: 'Puerto Callao Sub-Sótano 2' }
];

const ROLES: UserRole[] = ['Administrador', 'Almacenero', 'Comprador', 'Jefe de Cocina', 'Auditor'];

export default function App() {
  
  // Auth states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSandboxMode, setIsSandboxMode] = useState(false);

  // Simulation Profile States
  const [activeRole, setActiveRole] = useState<UserRole>('Almacenero');
  const [activeWarehouse, setActiveWarehouse] = useState<Warehouse>(WAREHOUSES[0]);

  // DB Data states
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [syncMessage, setSyncMessage] = useState('');

  // Collections
  const [items, setItems] = useState<StockItem[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [programItems, setProgramItems] = useState<MonthlyProgramItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // Recipes (Static config/formula dictionary)
  const recipes = [
    {
      id: 'REC-01',
      name: 'Arroz con Pollo Institucional',
      description: 'Plato principal rico en carbohidratos y proteínas para raciones de gran escala.',
      ingredients: [
        { sku: 'SKU-ARR-01', name: 'Arroz Extra Costeño', qtyPerServing: 80, unit: 'g' },
        { sku: 'SKU-POLLO-02', name: 'Pechuga de Pollo Fresco', qtyPerServing: 120, unit: 'g' },
        { sku: 'SKU-ACEITE-03', name: 'Aceite Vegetal Premium', qtyPerServing: 15, unit: 'ml' }
      ]
    },
    {
      id: 'REC-02',
      name: 'Guiso de Lentejas Nutritivo',
      description: 'Menú balanceado de alta durabilidad y bajo costo de adquisición.',
      ingredients: [
        { sku: 'SKU-LEN-04', name: 'Lenteja de Grano Entero', qtyPerServing: 90, unit: 'g' },
        { sku: 'SKU-ACEITE-03', name: 'Aceite Vegetal Premium', qtyPerServing: 10, unit: 'ml' }
      ]
    }
  ];

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Monitor Auth Status
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        setIsSandboxMode(false);
        // Persist token for Workspace integration if redirect happened
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = urlParams.get('access_token');
        if (accessToken) {
          localStorage.setItem('google_access_token', accessToken);
        }

        // Fetch user profile from Firestore /users/{uid} to sync role state
        firestoreAdapter.getDocument<{ role: UserRole }>('users', user.uid)
          .then((profile) => {
            if (profile && profile.role) {
              setActiveRole(profile.role);
              console.log(`[AUTH-RBAC] Synced user role from database: ${profile.role}`);
            } else {
              // Default fallback to Auditor if role is missing
              setActiveRole('Auditor');
            }
          })
          .catch((err) => {
            console.warn('[AUTH-RBAC] Could not load custom role document, using Auditor role:', err);
            setActiveRole('Auditor');
          });
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch/Seed database
  const loadDatabase = async () => {
    setLoading(true);
    try {
      let fetchedItems = await firestoreAdapter.getCollection<StockItem>('items');
      let fetchedBudgets = await firestoreAdapter.getCollection<Budget>('budgets');
      let fetchedTenders = await firestoreAdapter.getCollection<Tender>('tenders');
      let fetchedBids = await firestoreAdapter.getCollection<Bid>('bids');
      let fetchedTransactions = await firestoreAdapter.getCollection<StockTransaction>('transactions');
      let fetchedMenus = await firestoreAdapter.getCollection<MenuItem>('menuItems');
      let fetchedStaff = await firestoreAdapter.getCollection<StaffMember>('staff');
      let fetchedVehicles = await firestoreAdapter.getCollection<Vehicle>('vehicles');
      let fetchedEquip = await firestoreAdapter.getCollection<Equipment>('equipment');
      let fetchedProg = await firestoreAdapter.getCollection<MonthlyProgramItem>('programItems');
      let fetchedPo = await firestoreAdapter.getCollection<PurchaseOrder>('purchaseOrders');

      // If database is completely unseeded, execute seed schema
      if (fetchedItems.length === 0) {
        setSeeding(true);
        await firestoreAdapter.seedDatabaseIfEmpty();
        setSeeding(false);
        
        // Refetch after seeding
        fetchedItems = await firestoreAdapter.getCollection<StockItem>('items');
        fetchedBudgets = await firestoreAdapter.getCollection<Budget>('budgets');
        fetchedTenders = await firestoreAdapter.getCollection<Tender>('tenders');
        fetchedBids = await firestoreAdapter.getCollection<Bid>('bids');
        fetchedTransactions = await firestoreAdapter.getCollection<StockTransaction>('transactions');
        fetchedMenus = await firestoreAdapter.getCollection<MenuItem>('menuItems');
        fetchedStaff = await firestoreAdapter.getCollection<StaffMember>('staff');
        fetchedVehicles = await firestoreAdapter.getCollection<Vehicle>('vehicles');
        fetchedEquip = await firestoreAdapter.getCollection<Equipment>('equipment');
        fetchedProg = await firestoreAdapter.getCollection<MonthlyProgramItem>('programItems');
        fetchedPo = await firestoreAdapter.getCollection<PurchaseOrder>('purchaseOrders');
      }

      setItems(fetchedItems);
      setBudgets(fetchedBudgets);
      setTransactions(fetchedTransactions);
      setTenders(fetchedTenders);
      setBids(fetchedBids);
      setMenuItems(fetchedMenus);
      setStaff(fetchedStaff);
      setVehicles(fetchedVehicles);
      setEquipment(fetchedEquip);
      setProgramItems(fetchedProg);
      setPurchaseOrders(fetchedPo);

    } catch (err: any) {
      console.error('Error fetching database collections:', err);
      const errStr = String(err.message || err);
      if (errStr.includes('permission') || errStr.includes('403') || errStr.includes('insufficient')) {
        toast.error('Acceso Restringido (403): Su rol actual no posee los permisos suficientes para leer la colección de stock_items o algunos recursos del sistema.', {
          duration: 8000
        });
      } else {
        toast.error('Error al cargar la base de datos de SIGAL V2: ' + errStr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser || isSandboxMode) {
      loadDatabase();
    }
  }, [currentUser, isSandboxMode]);

  // CRUD & TRANSACTION HANDLERS
  
  // Inventory movement atomic transaction with Optimistic UI updates
  const handleExecuteMovement = async (
    itemId: string,
    type: 'IN' | 'OUT',
    qty: number,
    details: string
  ): Promise<{ success: boolean; msg: string }> => {
    
    const userEmail = currentUser?.email || 'sandboxed_erp@sigalerp.gob.pe';
    
    // Find item to calculate and update state optimistically
    const itemIndex = items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      return { success: false, msg: 'Artículo no encontrado para actualizar.' };
    }
    
    const targetItem = items[itemIndex];
    const prevQty = targetItem.stockActual;
    const newQty = type === 'IN' ? prevQty + qty : Math.max(0, prevQty - qty);
    
    // Check for negative stock
    if (type === 'OUT' && prevQty < qty) {
      toast.warning(`Atención: Retirando más stock del disponible. El stock disponible es ${prevQty} ${targetItem.unit}.`);
    }

    // Preserve original states for potential rollback
    const originalItems = [...items];
    const originalTransactions = [...transactions];
    
    // Apply state updates optimistically in React state
    const updatedItems = [...items];
    updatedItems[itemIndex] = {
      ...targetItem,
      stockActual: newQty
    };
    setItems(updatedItems);
    
    // Prepend optimistic transaction entry
    const optTxId = 'opt-' + Date.now();
    const optimisticTx: StockTransaction = {
      id: optTxId,
      timestamp: new Date().toISOString(),
      itemId,
      itemName: targetItem.name,
      sku: targetItem.sku,
      warehouseId: targetItem.warehouseId,
      warehouseName: targetItem.warehouseId === 'W-01' ? 'Almacén Central (Secos)' : 'Cámara Frigorífica (Congelados)',
      type,
      quantity: qty,
      previousQty: prevQty,
      newQty,
      userId: userEmail,
      userName: userEmail.split('@')[0],
      userRole: activeRole,
      details: `${details} (Sincronizando con la nube...)`
    };
    setTransactions([optimisticTx, ...transactions]);
    
    // Display elegant sonner toast
    const toastLabel = `${type === 'IN' ? 'Entrada' : 'Salida'}: ${qty} ${targetItem.unit} de ${targetItem.name}`;
    toast.promise(
      firestoreAdapter.executeStockMovement(
        itemId,
        type,
        qty,
        details,
        userEmail,
        activeRole
      ),
      {
        loading: `Procesando ${toastLabel}...`,
        success: (res) => {
          if (res.success) {
            // Re-fetch in background to ensure accurate synchronization
            loadDatabase();
            return `¡Éxito! ${toastLabel} registrado correctamente.`;
          } else {
            // Rollback state if the response returned success: false
            setItems(originalItems);
            setTransactions(originalTransactions);
            throw new Error(res.msg || 'Falla de regla de negocio');
          }
        },
        error: (err) => {
          // Rollback state on error
          setItems(originalItems);
          setTransactions(originalTransactions);
          return `Error al registrar movimiento: ${err.message || err || 'Falla de red'}. Reestableciendo stock anterior.`;
        }
      }
    );

    // Return success immediately so the modal form closes instantly without blocking spinner
    return { success: true, msg: 'Movimiento registrado optimistamente.' };
  };

  // Sync Google Sheets Mirror
  const handleTriggerSyncSheets = async () => {
    setSyncStatus('SYNCING');
    setSyncMessage('Procesando sincronización con Google Sheets Mirror...');
    try {
      const token = localStorage.getItem('google_access_token') || '';
      const res = await fetch('/api/workspace/sync-sheets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatus('SUCCESS');
        setSyncMessage('Sincronización completa. Espejo de Sheets actualizado con éxito.');
      } else {
        setSyncStatus('ERROR');
        setSyncMessage(data.msg || 'Falla en autenticación OAuth. Conéctese con Google.');
      }
    } catch (err: any) {
      setSyncStatus('ERROR');
      setSyncMessage(err.message || 'Error en comunicación de red.');
    }
  };

  // Google Drive directories setup
  const handleTriggerDriveSetup = async () => {
    setSyncStatus('SYNCING');
    setSyncMessage('Creando directorios jerárquicos en Google Drive...');
    try {
      const token = localStorage.getItem('google_access_token') || '';
      const res = await fetch('/api/workspace/setup-drive', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatus('SUCCESS');
        setSyncMessage('Estructura de Carpetas SIGAL V2 creada de manera exitosa.');
      } else {
        setSyncStatus('ERROR');
        setSyncMessage(data.msg || 'Falta permisos de OAuth. Use el login de Google.');
      }
    } catch (err: any) {
      setSyncStatus('ERROR');
      setSyncMessage('Error creando carpetas.');
    }
  };

  // Budget commits
  const handleCommitBudget = async (budgetCode: string, amount: number) => {
    const budget = budgets.find(b => b.code === budgetCode);
    if (!budget) return;
    
    await firestoreAdapter.updateDocument('budgets', budget.id, {
      committedAmount: budget.committedAmount + amount,
      availableAmount: budget.availableAmount - amount
    });
    await loadDatabase();
  };

  // Tenders modification
  const handleUpdateTender = async (id: string, updates: Partial<Tender>) => {
    await firestoreAdapter.updateDocument('tenders', id, updates);
    await loadDatabase();
  };

  const handleAddTender = async (tender: Tender) => {
    await firestoreAdapter.addDocument('tenders', tender);
    await loadDatabase();
  };

  // Bids registry
  const handleAddBid = async (bid: Bid) => {
    await firestoreAdapter.addDocument('bids', bid);
    await loadDatabase();
  };

  // Menu planners
  const handleAddMenu = async (menu: MenuItem) => {
    await firestoreAdapter.addDocument('menuItems', menu);
    await loadDatabase();
  };

  const handleApproveMenu = async (menuId: string, itemDeductions: Array<{ sku: string, qty: number }>): Promise<{ success: boolean; msg: string }> => {
    try {
      // 1. Deduct ingredient stock items sequentially
      for (const deduction of itemDeductions) {
        const targetItem = items.find(i => i.sku === deduction.sku);
        if (targetItem) {
          await firestoreAdapter.executeStockMovement(
            targetItem.id,
            'OUT',
            deduction.qty,
            `Consumo programado por ración del menú ID: ${menuId}`,
            currentUser?.email || 'sandboxed_erp@sigalerp.gob.pe',
            activeRole
          );
        }
      }

      // 2. Mark menu as served
      await firestoreAdapter.updateDocument('menuItems', menuId, { status: 'Servido' });
      await loadDatabase();
      return { success: true, msg: 'Menú servido de manera exitosa.' };
    } catch (err: any) {
      return { success: false, msg: err.message || 'Error descontando ingredientes.' };
    }
  };

  // Add resources helpers
  const handleAddStaff = async (member: StaffMember) => {
    await firestoreAdapter.addDocument('staff', member);
    await loadDatabase();
  };

  const handleAddVehicle = async (veh: Vehicle) => {
    await firestoreAdapter.addDocument('vehicles', veh);
    await loadDatabase();
  };

  const handleTriggerMaintenance = async (type: 'vehicle' | 'equipment', id: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (type === 'vehicle') {
      await firestoreAdapter.updateDocument('vehicles', id, {
        status: 'Mantenimiento',
        nextMaintenance: today
      });
    } else {
      await firestoreAdapter.updateDocument('equipment', id, {
        status: 'Mantenimiento',
        lastMaintenance: today
      });
    }
    await loadDatabase();
  };

  // Add PO helper
  const handleAddPurchaseOrder = async (po: PurchaseOrder) => {
    await firestoreAdapter.addDocument('purchaseOrders', po);
    await loadDatabase();
  };

  // Render helpers
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-white space-y-3">
        <Loader className="h-8 w-8 animate-spin text-teal-400" />
        <span className="text-xs font-mono tracking-wider uppercase text-slate-400">Verificando Credenciales de Acceso...</span>
      </div>
    );
  }

  // Pre-login state (Unified secure panel or ERP Simulation portal)
  if (!currentUser && !isSandboxMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="bg-slate-950 p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="h-6 w-6 text-teal-400" />
              <div>
                <h1 className="text-sm font-bold text-white tracking-wider uppercase">SIGAL V2 Enterprise ERP</h1>
                <p className="text-[10px] text-slate-400 font-mono">Gestión Integral de Víveres y Licitaciones Públicas</p>
              </div>
            </div>
            <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded font-mono font-bold uppercase">
              V2 Secure Run
            </span>
          </div>

          {/* Description Body */}
          <div className="p-6 space-y-6 text-xs text-slate-300">
            <p className="leading-relaxed">
              Bienvenido al portal oficial de **SIGAL V2**. Este ERP centraliza y orquesta la cadena de suministros alimenticios, auditoría de Kardex y validación de ofertas estatales con el soporte cognitivo de **Gemini Intelligent Agents**.
            </p>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <h3 className="font-bold text-white uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
                <Globe className="h-4 w-4 text-teal-400" />
                <span>Módulos Críticos Incorporados:</span>
              </h3>
              <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                <li><strong className="text-slate-200">Módulo A:</strong> Observabilidad Analítica & Valoración de Inventario</li>
                <li><strong className="text-slate-200">Módulo B:</strong> Kardex Físico Atómico y Sensor de OCR Inteligente de Facturas</li>
                <li><strong className="text-slate-200">Módulo C:</strong> Control de Licitaciones, Evaluación IA & Firma en Google Docs</li>
                <li><strong className="text-slate-200">Módulo D:</strong> Planificación de Menús, Explosión de BOM & Cocina</li>
                <li><strong className="text-slate-200">Módulo E:</strong> Recursos Operacionales (Personal, Flota y Cámaras Frías)</li>
                <li><strong className="text-slate-200">Módulo F:</strong> Necesidades Anuales y Estimador de Demanda (Forecast AI)</li>
              </ul>
            </div>

            {/* Login options */}
            <div className="space-y-3 pt-2">
              
              {/* Option A: Secure Google Sign In with Workspace OAuth */}
              <button
                onClick={signInWithGoogle}
                className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
              >
                <Globe className="h-5 w-5" />
                <span>Acceder con Cuenta Corporativa Google (OAuth)</span>
              </button>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono py-1">
                <span className="h-px bg-slate-800 w-full mr-2"></span>
                <span>O</span>
                <span className="h-px bg-slate-800 w-full ml-2"></span>
              </div>

              {/* Option B: Local preview sandbox with custom roles */}
              <button
                onClick={() => setIsSandboxMode(true)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-xl transition-all border border-slate-700 flex items-center justify-center space-x-2"
              >
                <Terminal className="h-4 w-4 text-slate-400" />
                <span>Entrar en Modo Simulador Local (Sin Google OAuth)</span>
              </button>

            </div>
          </div>

          <div className="bg-slate-950 p-4 border-t border-slate-800/60 text-center text-[10px] text-slate-500">
            Seguridad auditada bajo controles de firma estatal peruana.
          </div>

        </div>

      </div>
    );
  }

  // Dashboard layout once loaded
  return (
    <div className="min-h-screen bg-[#F4F4F5] text-[#18181B] flex flex-col font-sans">
      <Toaster position="top-right" richColors />
      
      {/* Header bar and role switcher */}
      <Navbar 
        user={currentUser || { email: 'simulado@sigalerp.gob.pe', displayName: 'Administrador ERP (Simulación)' } as any}
        role={activeRole}
        onChangeRole={setActiveRole}
        needsAuth={!currentUser && !isSandboxMode}
        onLogin={signInWithGoogle}
        onLogout={isSandboxMode ? () => setIsSandboxMode(false) : logoutUser}
        activeWarehouse={activeWarehouse}
        onWarehouseChange={setActiveWarehouse}
        warehouses={WAREHOUSES}
        activeTab={activeTab === 'purchase-orders' ? 'orders' : activeTab}
        onTabChange={(tab) => setActiveTab(tab === 'orders' ? 'purchase-orders' : tab)}
        syncStatus={{
          status: syncStatus === 'IDLE' ? 'idle' : syncStatus === 'SYNCING' ? 'syncing' : syncStatus === 'SUCCESS' ? 'synced' : 'warning',
          msg: syncMessage || 'Sincronizado'
        }}
        isOnline={!isSandboxMode}
      />

      {/* Sync banner notification for Workspace feedback */}
      {syncStatus !== 'IDLE' && (
        <div className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between transition-all ${
          syncStatus === 'SYNCING' ? 'bg-blue-50 text-blue-800 border-b border-blue-200' :
          syncStatus === 'SUCCESS' ? 'bg-green-50 text-green-800 border-b border-green-200' :
          'bg-red-50 text-red-800 border-b border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {syncStatus === 'SYNCING' && <Loader className="h-4 w-4 animate-spin text-blue-600" />}
            {syncStatus === 'SUCCESS' && <CheckCircle className="h-4 w-4 text-green-600" />}
            {syncStatus === 'ERROR' && <AlertCircle className="h-4 w-4 text-red-600" />}
            <span>{syncMessage}</span>
          </div>
          <button 
            onClick={() => setSyncStatus('IDLE')}
            className="text-[#71717A] hover:text-[#18181B]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">

        {/* Tab Panel contents render */}
        {loading ? (
          seeding ? (
            <div className="flex flex-col justify-center items-center py-20 space-y-3">
              <Loader className="h-8 w-8 animate-spin text-[#18181B]" />
              <span className="text-xs font-mono text-[#71717A]">
                Creando base de datos Firestore corporativa...
              </span>
            </div>
          ) : (
            <SkeletonLoader tab={activeTab} />
          )
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
            >
              {activeTab === 'dashboard' && (
                <DashboardTab
                  items={items}
                  budgets={budgets}
                  transactions={transactions}
                  tenders={tenders}
                  menuItems={menuItems}
                  onNavigateToTab={setActiveTab}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryTab
                  items={items}
                  transactions={transactions}
                  activeWarehouse={activeWarehouse}
                  role={activeRole}
                  userEmail={currentUser?.email || 'simulacion@sigalerp.gob.pe'}
                  onExecuteMovement={handleExecuteMovement}
                  onAddItem={async () => {}}
                  onTriggerSyncSheets={handleTriggerSyncSheets}
                />
              )}

              {activeTab === 'procurement' && (
                <ProcurementTab
                  tenders={tenders}
                  bids={bids}
                  suppliers={[
                    { id: 'S-01', name: 'Distribuidora Alimenticia S.A.', ruc: '20554488331', contactEmail: 'contacto@distalimenticia.com', category: 'Granos y Secos' },
                    { id: 'S-02', name: 'Frigorífico San Martín', ruc: '20113344558', contactEmail: 'ventas@frigosanmartin.com', category: 'Cárnicos y Congelados' }
                  ]}
                  budgets={budgets}
                  role={activeRole}
                  onUpdateTender={handleUpdateTender}
                  onAddTender={handleAddTender}
                  onAddBid={handleAddBid}
                  onCommitBudget={handleCommitBudget}
                />
              )}

              {activeTab === 'nutrition' && (
                <NutritionTab
                  menuItems={menuItems}
                  recipes={recipes}
                  stockItems={items}
                  role={activeRole}
                  userEmail={currentUser?.email || 'simulacion@sigalerp.gob.pe'}
                  onAddMenu={handleAddMenu}
                  onApproveMenu={handleApproveMenu}
                />
              )}

              {activeTab === 'purchase-orders' && (
                <PurchaseOrdersTab
                  programItems={programItems}
                  purchaseOrders={purchaseOrders}
                  items={items}
                  transactions={transactions}
                  onTriggerDriveSetup={handleTriggerDriveSetup}
                  onAddPurchaseOrder={handleAddPurchaseOrder}
                />
              )}

              {activeTab === 'resources' && (
                <ResourcesTab
                  staff={staff}
                  vehicles={vehicles}
                  equipment={equipment}
                  budgets={budgets}
                  role={activeRole}
                  onAddStaff={handleAddStaff}
                  onAddVehicle={handleAddVehicle}
                  onTriggerMaintenance={handleTriggerMaintenance}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}

      </main>

      {/* Global simple status indicator footer */}
      <footer className="bg-white border-t border-[#E4E4E7] p-4 text-center text-xs text-[#71717A] font-sans flex flex-col md:flex-row justify-between items-center px-6 gap-2 shrink-0">
        <span className="flex items-center gap-1.5 justify-center font-bold uppercase text-[9px] tracking-wider">
          <Database className="h-3.5 w-3.5 text-[#18181B]" />
          <span>Servicio Firestore: Conectado</span>
        </span>
        <span className="font-bold uppercase text-[9px] tracking-wider">SIGAL V2 Enterprise ERP © 2026 | Gobierno de la República</span>
        <span className="text-[9px] font-bold uppercase tracking-wider bg-[#F4F4F5] text-[#18181B] border border-[#E4E4E7] px-2 py-0.5 rounded-sm">
          {isSandboxMode ? 'Entorno de Pruebas ERP' : `OAuth Conectado: ${currentUser?.displayName}`}
        </span>
      </footer>

    </div>
  );
}
