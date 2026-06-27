/**
 * SIGAL V2 Enterprise ERP - Firestore Domain Service & Database Seeding
 */

import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  limit, 
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  Warehouse, 
  StockItem, 
  StockTransaction, 
  Budget, 
  Recipe, 
  MenuItem, 
  Tender, 
  Bid, 
  Supplier, 
  StaffMember, 
  Vehicle, 
  Equipment, 
  MonthlyProgramItem, 
  PurchaseOrder, 
  AuditLog,
  UserRole
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Generic CRUD helper
async function getCollectionData<T>(collectionName: string): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionName);
  }
}

const COLLECTION_MAP: { [key: string]: string } = {
  'items': 'stock_items',
  'transactions': 'stock_transactions',
  'menuItems': 'menu_items',
  'staff': 'staff_members',
  'vehicles': 'vehicles',
  'equipment': 'equipment',
  'programItems': 'monthly_program_items',
  'purchaseOrders': 'purchase_orders'
};

export async function getFirestoreCollection<T>(collectionName: string): Promise<T[]> {
  const mappedName = COLLECTION_MAP[collectionName] || collectionName;
  return await getCollectionData<T>(mappedName);
}

export const getFirestoreData = getFirestoreCollection;

export async function addFirestoreDocument(collectionName: string, data: any) {
  const mappedName = COLLECTION_MAP[collectionName] || collectionName;
  try {
    const colRef = collection(db, mappedName);
    return await addDoc(colRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, mappedName);
  }
}

export async function updateFirestoreDocument(collectionName: string, id: string, updates: any) {
  const mappedName = COLLECTION_MAP[collectionName] || collectionName;
  try {
    const docRef = doc(db, mappedName, id);
    return await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${mappedName}/${id}`);
  }
}

export const seedEnterpriseDatabase = seedDatabaseIfEmpty;

export async function executeStockMovementTransaction(
  itemId: string,
  type: 'IN' | 'OUT',
  qty: number,
  details: string,
  userEmail: string,
  userRole: UserRole
): Promise<{ success: boolean; msg: string }> {
  try {
    const itemRef = doc(db, 'stock_items', itemId);
    let itemDoc;
    try {
      itemDoc = await getDoc(itemRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `stock_items/${itemId}`);
    }
    if (!itemDoc.exists()) {
      return { success: false, msg: 'Artículo no existe.' };
    }
    const itemData = itemDoc.data() as StockItem;
    const warehouseId = itemData.warehouseId || 'W-01';

    return await executeInventoryTransaction(
      itemId,
      warehouseId,
      type,
      qty,
      userEmail,
      userEmail.split('@')[0],
      userRole,
      details
    );
  } catch (err: any) {
    return { success: false, msg: err.message || 'Error en transacción' };
  }
}

// Global logger helper
export async function logAuditEvent(
  userId: string,
  userName: string,
  userRole: UserRole,
  action: string,
  endpoint: string,
  before: any = null,
  after: any = null
) {
  try {
    const colRef = collection(db, 'audit_logs');
    const log: Partial<AuditLog> = {
      timestamp: new Date().toISOString(),
      userId,
      userName,
      userRole,
      action,
      endpoint,
      before,
      after
    };
    try {
      await addDoc(colRef, log);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'audit_logs');
    }
    
    // Also log to the backend server endpoint
    await fetch('/api/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    }).catch(err => console.warn('No se pudo duplicar log en el servidor:', err));
  } catch (error) {
    console.error('No se pudo registrar log forense de auditoría:', error);
  }
}

// Seeding standard enterprise data if collections are empty
export async function seedDatabaseIfEmpty() {
  const warehouses = await getCollectionData<Warehouse>('warehouses');
  if (warehouses.length > 0) return; // Already seeded

  console.log('Seeding SIGAL V2 database collections...');

  // 1. Seed Warehouses
  const seedWarehouses: Warehouse[] = [
    { id: 'W-01', name: 'Almacén Central Seco', location: 'Pabellón Norte, Sector A' },
    { id: 'W-02', name: 'Almacén Frigorífico', location: 'Pabellón Sur, Sector B' },
    { id: 'W-03', name: 'Almacén de Contingencia', location: 'Pabellón Este, Sector C' }
  ];
  for (const w of seedWarehouses) {
    await setDoc(doc(db, 'warehouses', w.id), w);
  }

  // 2. Seed Budgets
  const seedBudgets: Budget[] = [
    { id: 'B-101', code: 'P-101', name: 'Víveres Básicos y Perecederos', allocatedAmount: 500000, committedAmount: 120000, executedAmount: 85000, availableAmount: 295000 },
    { id: 'B-102', code: 'P-102', name: 'Flota Vehicular y Logística', allocatedAmount: 150000, committedAmount: 30000, executedAmount: 25000, availableAmount: 95000 },
    { id: 'B-103', code: 'P-103', name: 'Equipamiento de Refrigeración', allocatedAmount: 100000, committedAmount: 15000, executedAmount: 10000, availableAmount: 75000 }
  ];
  for (const b of seedBudgets) {
    await setDoc(doc(db, 'budgets', b.id), b);
  }

  // 3. Seed Suppliers
  const seedSuppliers: Supplier[] = [
    { id: 'S-01', name: 'Distribuidora Alimenticia S.A.', ruc: '20554488331', contactEmail: 'ventas@disalimenticia.com', category: 'Granos y Secos' },
    { id: 'S-02', name: 'Frigorífico San Martín', ruc: '20123456789', contactEmail: 'contacto@frigosanmartin.com', category: 'Cárnicos y Congelados' },
    { id: 'S-03', name: 'Lácteos del Sur Corp', ruc: '20987654321', contactEmail: 'licitaciones@lacteosdelsur.com', category: 'Lácteos y Derivados' }
  ];
  for (const s of seedSuppliers) {
    await setDoc(doc(db, 'suppliers', s.id), s);
  }

  // 4. Seed Stock Items
  const seedItems: StockItem[] = [
    { id: 'I-01', sku: 'SKU-ARR-001', name: 'Arroz Extra Grano Largo', category: 'No Perecederos', unit: 'Sacos de 50kg', unitCost: 120, stockActual: 150, stockMinimo: 50, supplierId: 'S-01', batchCode: 'L-ARR-2026', expirationDate: '2027-06-30', warehouseId: 'W-01' },
    { id: 'I-02', sku: 'SKU-ACE-002', name: 'Aceite Vegetal Premium', category: 'No Perecederos', unit: 'Caja x 12 Botellas 1L', unitCost: 85, stockActual: 12, stockMinimo: 20, supplierId: 'S-01', batchCode: 'L-ACE-011', expirationDate: '2026-12-15', warehouseId: 'W-01' }, // Critical Stock!
    { id: 'I-03', sku: 'SKU-CAR-003', name: 'Pechuga de Pollo Fresca', category: 'Refrigerados', unit: 'Cajas de 20kg', unitCost: 180, stockActual: 45, stockMinimo: 15, supplierId: 'S-02', batchCode: 'L-CHICK-99', expirationDate: '2026-07-05', warehouseId: 'W-02' }, // Expires soon!
    { id: 'I-04', sku: 'SKU-LEC-004', name: 'Leche Evaporada Entera', category: 'No Perecederos', unit: 'Caja x 48 Latas', unitCost: 140, stockActual: 80, stockMinimo: 30, supplierId: 'S-03', batchCode: 'L-MILK-772', expirationDate: '2027-02-18', warehouseId: 'W-01' },
    { id: 'I-05', sku: 'SKU-FID-005', name: 'Fideos Spaghetti Extra', category: 'No Perecederos', unit: 'Caja de 10kg', unitCost: 45, stockActual: 5, stockMinimo: 15, supplierId: 'S-01', batchCode: 'L-FID-02', expirationDate: '2027-04-10', warehouseId: 'W-01' }  // Critical Stock!
  ];
  for (const item of seedItems) {
    await setDoc(doc(db, 'stock_items', item.id), item);
  }

  // 5. Seed Staff
  const seedStaff: StaffMember[] = [
    { id: 'ST-01', name: 'Carlos Mendoza', role: 'Almacenero', shift: 'Mañana', status: 'Activo' },
    { id: 'ST-02', name: 'Lic. Laura Benítez', role: 'Jefe de Cocina', shift: 'Mañana', status: 'Activo' },
    { id: 'ST-03', name: 'Ing. Roberto Silva', role: 'Comprador', shift: 'Mañana', status: 'Activo' },
    { id: 'ST-04', name: 'Dra. María Ramos', role: 'Auditor', shift: 'Tarde', status: 'Activo' }
  ];
  for (const s of seedStaff) {
    await setDoc(doc(db, 'staff_members', s.id), s);
  }

  // 6. Seed Vehicles
  const seedVehicles: Vehicle[] = [
    { id: 'V-01', plates: 'EGB-420', capacityKg: 3500, status: 'Disponible', nextMaintenance: '2026-07-15' },
    { id: 'V-02', plates: 'FJS-789', capacityKg: 1500, status: 'Disponible', nextMaintenance: '2026-08-01' }
  ];
  for (const v of seedVehicles) {
    await setDoc(doc(db, 'vehicles', v.id), v);
  }

  // 7. Seed Equipment
  const seedEquipment: Equipment[] = [
    { id: 'EQ-01', name: 'Cámara de Frío Principal', type: 'Cámara Refrigeración', status: 'Operativo', lastMaintenance: '2026-05-10' },
    { id: 'EQ-02', name: 'Estantería Industrial Heavy-Duty', type: 'Estantería', status: 'Operativo', lastMaintenance: '2025-12-01' }
  ];
  for (const eq of seedEquipment) {
    await setDoc(doc(db, 'equipment', eq.id), eq);
  }

  // 8. Seed Recipes (BOM)
  const seedRecipes: Recipe[] = [
    {
      id: 'REC-01',
      name: 'Arroz con Pollo Institucional',
      description: 'Plato principal balanceado de pollo con arroz, vegetales y condimentos.',
      ingredients: [
        { sku: 'SKU-ARR-001', name: 'Arroz Extra Grano Largo', qtyPerServing: 100, unit: 'g' },
        { sku: 'SKU-CAR-003', name: 'Pechuga de Pollo Fresca', qtyPerServing: 120, unit: 'g' }
      ]
    },
    {
      id: 'REC-02',
      name: 'Tallarines con salsa láctea',
      description: 'Spaghetti servido con salsa a base de leche evaporada.',
      ingredients: [
        { sku: 'SKU-FID-005', name: 'Fideos Spaghetti Extra', qtyPerServing: 80, unit: 'g' },
        { sku: 'SKU-LEC-004', name: 'Leche Evaporada Entera', qtyPerServing: 50, unit: 'g' }
      ]
    }
  ];
  for (const r of seedRecipes) {
    await setDoc(doc(db, 'recipes', r.id), r);
  }

  // 9. Seed Tenders
  const seedTenders: Tender[] = [
    {
      id: 'TND-01',
      title: 'Licitación Abastecimiento de Arroz Trimestral',
      description: 'Suministro de arroz extra grano largo para comedores populares.',
      budgetCode: 'P-101',
      budgetAmount: 120000,
      status: 'Publicada',
      deadline: '2026-07-20',
      items: [
        { name: 'Arroz Extra Grano Largo (Sacos 50kg)', quantity: 1000, targetUnitCost: 120 }
      ],
      createdAt: new Date().toISOString()
    }
  ];
  for (const t of seedTenders) {
    await setDoc(doc(db, 'tenders', t.id), t);
  }

  // 10. Seed Bids
  const seedBids: Bid[] = [
    {
      id: 'BID-01',
      tenderId: 'TND-01',
      supplierId: 'S-01',
      supplierName: 'Distribuidora Alimenticia S.A.',
      amount: 118000,
      proposalSummary: 'Ofrecemos arroz extra de primera cosecha. Entrega en 3 lotes mensuales. Sello de garantía de calidad agropecuaria.',
      docUrl: 'https://docs.google.com/document/d/mock_doc_id_1/edit',
      status: 'PENDING'
    }
  ];
  for (const b of seedBids) {
    await setDoc(doc(db, 'bids', b.id), b);
  }

  console.log('SIGAL V2 Seeding Completed Successfully.');
}

// Custom Transaction for Inventory Movement (atómico)
export async function executeInventoryTransaction(
  itemId: string,
  warehouseId: string,
  type: 'IN' | 'OUT',
  qty: number,
  userId: string,
  userName: string,
  userRole: UserRole,
  details: string
): Promise<{ success: boolean; msg: string }> {
  try {
    const itemRef = doc(db, 'stock_items', itemId);
    const result = await runTransaction(db, async (transaction) => {
      const itemDoc = await transaction.get(itemRef);
      if (!itemDoc.exists()) {
        throw new Error('El artículo seleccionado no existe.');
      }
      
      const itemData = itemDoc.data() as StockItem;
      const prevQty = itemData.stockActual;
      let newQty = prevQty;

      if (type === 'OUT') {
        if (prevQty < qty) {
          throw new Error(`Stock insuficiente. Stock actual: ${prevQty}, Solicitado: ${qty}`);
        }
        newQty = prevQty - qty;
      } else {
        newQty = prevQty + qty;
      }

      // Update Stock
      transaction.update(itemRef, { stockActual: newQty });

      // Create Kardex Transaction
      const transRef = doc(collection(db, 'stock_transactions'));
      const trans: StockTransaction = {
        id: transRef.id,
        timestamp: new Date().toISOString(),
        itemId,
        itemName: itemData.name,
        sku: itemData.sku,
        warehouseId,
        warehouseName: itemData.warehouseId === 'W-01' ? 'Almacén Central Seco' : itemData.warehouseId === 'W-02' ? 'Almacén Frigorífico' : 'Almacén de Contingencia',
        type,
        quantity: qty,
        previousQty: prevQty,
        newQty,
        userId,
        userName,
        userRole,
        details
      };

      transaction.set(transRef, trans);

      return { success: true, item: itemData, prevQty, newQty };
    });

    // Logging after transaction commits
    await logAuditEvent(
      userId,
      userName,
      userRole,
      `${type === 'IN' ? 'Entrada' : 'Salida'} de Almacén: ${result.item.name} (${qty} ${result.item.unit})`,
      `/api/inventory/transaction`,
      { stockActual: result.prevQty },
      { stockActual: result.newQty }
    );

    return { success: true, msg: 'Movimiento de inventario registrado con éxito' };
  } catch (error: any) {
    console.error('Inventory transaction failed:', error);
    if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('insufficient')) {
      handleFirestoreError(error, OperationType.WRITE, `stock_items/${itemId}`);
    }
    return { success: false, msg: error.message || 'Error registrando transacción' };
  }
}
