import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '../../../../src/lib/firebase';
import { 
  Warehouse, 
  StockItem, 
  StockTransaction, 
  Budget, 
  Supplier, 
  StaffMember, 
  Vehicle, 
  Equipment, 
  Recipe, 
  Tender, 
  Bid, 
  UserRole,
  AuditLog
} from '../../../../src/types';
import { RegisterStockMovementCommand } from '../../application/commands/registerStockMovementCommand';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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

export class FirestoreAdapter {
  private getMappedCollectionName(name: string): string {
    return COLLECTION_MAP[name] || name;
  }

  async getCollection<T>(collectionName: string): Promise<T[]> {
    const mapped = this.getMappedCollectionName(collectionName);
    try {
      const colRef = collection(db, mapped);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as T);
    } catch (error) {
      this.handleError(error, OperationType.GET, mapped);
    }
  }

  async getDocument<T>(collectionName: string, id: string): Promise<T | null> {
    const mapped = this.getMappedCollectionName(collectionName);
    try {
      const docRef = doc(db, mapped, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as unknown as T;
      }
      return null;
    } catch (error) {
      this.handleError(error, OperationType.GET, `${mapped}/${id}`);
    }
  }

  async addDocument(collectionName: string, data: any): Promise<any> {
    const mapped = this.getMappedCollectionName(collectionName);
    try {
      const colRef = collection(db, mapped);
      return await addDoc(colRef, data);
    } catch (error) {
      this.handleError(error, OperationType.CREATE, mapped);
    }
  }

  async updateDocument(collectionName: string, id: string, updates: any): Promise<void> {
    const mapped = this.getMappedCollectionName(collectionName);
    try {
      const docRef = doc(db, mapped, id);
      await updateDoc(docRef, updates);
    } catch (error) {
      this.handleError(error, OperationType.UPDATE, `${mapped}/${id}`);
    }
  }

  async logAuditEvent(
    userId: string,
    userName: string,
    userRole: UserRole,
    action: string,
    endpoint: string,
    before: any = null,
    after: any = null
  ): Promise<void> {
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
      await addDoc(colRef, log);
      
      // Mirror to server-side Express logging
      await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      }).catch(err => console.warn('Could not mirror log to server:', err));
    } catch (error) {
      console.error('Audit logger failed:', error);
    }
  }

  async executeStockMovement(
    itemId: string,
    type: 'IN' | 'OUT',
    qty: number,
    details: string,
    userEmail: string,
    userRole: UserRole
  ): Promise<{ success: boolean; msg: string }> {
    try {
      const itemRef = doc(db, 'stock_items', itemId);
      const itemDoc = await getDoc(itemRef);
      if (!itemDoc.exists()) {
        return { success: false, msg: 'Artículo no existe.' };
      }
      const itemData = itemDoc.data() as StockItem;
      const warehouseId = itemData.warehouseId || 'W-01';

      const result = await runTransaction(db, async (transaction) => {
        const itemSnapshot = await transaction.get(itemRef);
        if (!itemSnapshot.exists()) {
          throw new Error('El artículo seleccionado no existe.');
        }

        const freshItem = itemSnapshot.data() as StockItem;
        
        // Use domain Command to handle stock adjustment + domain aggregate logic
        const command = new RegisterStockMovementCommand();
        const { updatedItem, prevQty, newQty } = command.execute({
          itemId,
          item: freshItem,
          type,
          qty,
          details,
          userId: userEmail,
          userName: userEmail.split('@')[0],
          userRole
        });

        // Save updated stock state
        transaction.update(itemRef, { stockActual: newQty });

        // Create transaction record
        const transRef = doc(collection(db, 'stock_transactions'));
        const trans: StockTransaction = {
          id: transRef.id,
          timestamp: new Date().toISOString(),
          itemId,
          itemName: freshItem.name,
          sku: freshItem.sku,
          warehouseId,
          warehouseName: freshItem.warehouseId === 'W-01' ? 'Almacén Central Seco' : freshItem.warehouseId === 'W-02' ? 'Almacén Frigorífico' : 'Almacén de Contingencia',
          type,
          quantity: qty,
          previousQty: prevQty,
          newQty,
          userId: userEmail,
          userName: userEmail.split('@')[0],
          userRole,
          details
        };

        transaction.set(transRef, trans);

        return { success: true, item: freshItem, prevQty, newQty };
      });

      // Audit Log
      await this.logAuditEvent(
        userEmail,
        userEmail.split('@')[0],
        userRole,
        `${type === 'IN' ? 'Entrada' : 'Salida'} de Almacén: ${result.item.name} (${qty} ${result.item.unit})`,
        `/api/inventory/transaction`,
        { stockActual: result.prevQty },
        { stockActual: result.newQty }
      );

      return { success: true, msg: 'Movimiento de inventario registrado con éxito.' };
    } catch (err: any) {
      console.error('Inventory transaction failed:', err);
      return { success: false, msg: err.message || 'Error en transacción' };
    }
  }

  async seedDatabaseIfEmpty(): Promise<void> {
    const warehouses = await this.getCollection<Warehouse>('warehouses');
    if (warehouses.length > 0) return;

    console.log('[DDD ADAPTER] Seeding database...');

    const seedWarehouses: Warehouse[] = [
      { id: 'W-01', name: 'Almacén Central Seco', location: 'Pabellón Norte, Sector A' },
      { id: 'W-02', name: 'Almacén Frigorífico', location: 'Pabellón Sur, Sector B' },
      { id: 'W-03', name: 'Almacén de Contingencia', location: 'Pabellón Este, Sector C' }
    ];
    for (const w of seedWarehouses) {
      await setDoc(doc(db, 'warehouses', w.id), w);
    }

    const seedBudgets: Budget[] = [
      { id: 'B-101', code: 'P-101', name: 'Víveres Básicos y Perecederos', allocatedAmount: 500000, committedAmount: 120000, executedAmount: 85000, availableAmount: 295000 },
      { id: 'B-102', code: 'P-102', name: 'Flota Vehicular y Logística', allocatedAmount: 150000, committedAmount: 30000, executedAmount: 25000, availableAmount: 95000 },
      { id: 'B-103', code: 'P-103', name: 'Equipamiento de Refrigeración', allocatedAmount: 100000, committedAmount: 15000, executedAmount: 10000, availableAmount: 75000 }
    ];
    for (const b of seedBudgets) {
      await setDoc(doc(db, 'budgets', b.id), b);
    }

    const seedSuppliers: Supplier[] = [
      { id: 'S-01', name: 'Distribuidora Alimenticia S.A.', ruc: '20554488331', contactEmail: 'ventas@disalimenticia.com', category: 'Granos y Secos' },
      { id: 'S-02', name: 'Frigorífico San Martín', ruc: '20123456789', contactEmail: 'contacto@frigosanmartin.com', category: 'Cárnicos y Congelados' },
      { id: 'S-03', name: 'Lácteos del Sur Corp', ruc: '20987654321', contactEmail: 'licitaciones@lacteosdelsur.com', category: 'Lácteos y Derivados' }
    ];
    for (const s of seedSuppliers) {
      await setDoc(doc(db, 'suppliers', s.id), s);
    }

    const seedItems: StockItem[] = [
      { id: 'I-01', sku: 'SKU-ARR-001', name: 'Arroz Extra Grano Largo', category: 'No Perecederos', unit: 'Sacos de 50kg', unitCost: 120, stockActual: 150, stockMinimo: 50, supplierId: 'S-01', batchCode: 'L-ARR-2026', expirationDate: '2027-06-30', warehouseId: 'W-01' },
      { id: 'I-02', sku: 'SKU-ACE-002', name: 'Aceite Vegetal Premium', category: 'No Perecederos', unit: 'Caja x 12 Botellas 1L', unitCost: 85, stockActual: 12, stockMinimo: 20, supplierId: 'S-01', batchCode: 'L-ACE-011', expirationDate: '2026-12-15', warehouseId: 'W-01' },
      { id: 'I-03', sku: 'SKU-CAR-003', name: 'Pechuga de Pollo Fresca', category: 'Refrigerados', unit: 'Cajas de 20kg', unitCost: 180, stockActual: 45, stockMinimo: 15, supplierId: 'S-02', batchCode: 'L-CHICK-99', expirationDate: '2026-07-05', warehouseId: 'W-02' },
      { id: 'I-04', sku: 'SKU-LEC-004', name: 'Leche Evaporada Entera', category: 'No Perecederos', unit: 'Caja x 48 Latas', unitCost: 140, stockActual: 80, stockMinimo: 30, supplierId: 'S-03', batchCode: 'L-MILK-772', expirationDate: '2027-02-18', warehouseId: 'W-01' },
      { id: 'I-05', sku: 'SKU-FID-005', name: 'Fideos Spaghetti Extra', category: 'No Perecederos', unit: 'Caja de 10kg', unitCost: 45, stockActual: 5, stockMinimo: 15, supplierId: 'S-01', batchCode: 'L-FID-02', expirationDate: '2027-04-10', warehouseId: 'W-01' }
    ];
    for (const item of seedItems) {
      await setDoc(doc(db, 'stock_items', item.id), item);
    }

    const seedStaff: StaffMember[] = [
      { id: 'ST-01', name: 'Carlos Mendoza', role: 'Almacenero', shift: 'Mañana', status: 'Activo' },
      { id: 'ST-02', name: 'Laura Benítez', role: 'Jefe de Cocina', shift: 'Mañana', status: 'Activo' },
      { id: 'ST-03', name: 'Roberto Silva', role: 'Comprador', shift: 'Mañana', status: 'Activo' },
      { id: 'ST-04', name: 'María Ramos', role: 'Auditor', shift: 'Tarde', status: 'Activo' }
    ];
    for (const s of seedStaff) {
      await setDoc(doc(db, 'staff_members', s.id), s);
    }

    const seedVehicles: Vehicle[] = [
      { id: 'V-01', plates: 'EGB-420', capacityKg: 3500, status: 'Disponible', nextMaintenance: '2026-07-15' },
      { id: 'V-02', plates: 'FJS-789', capacityKg: 1500, status: 'Disponible', nextMaintenance: '2026-08-01' }
    ];
    for (const v of seedVehicles) {
      await setDoc(doc(db, 'vehicles', v.id), v);
    }

    const seedEquipment: Equipment[] = [
      { id: 'EQ-01', name: 'Cámara de Frío Principal', type: 'Cámara Refrigeración', status: 'Operativo', lastMaintenance: '2026-05-10' },
      { id: 'EQ-02', name: 'Estantería Industrial Heavy-Duty', type: 'Estantería', status: 'Operativo', lastMaintenance: '2025-12-01' }
    ];
    for (const eq of seedEquipment) {
      await setDoc(doc(db, 'equipment', eq.id), eq);
    }

    const seedRecipes: Recipe[] = [
      {
        id: 'REC-01',
        name: 'Arroz con Pollo Institucional',
        description: 'Plato principal de arroz con pollo y vegetales.',
        ingredients: [
          { sku: 'SKU-ARR-001', name: 'Arroz Extra Grano Largo', qtyPerServing: 100, unit: 'g' },
          { sku: 'SKU-CAR-003', name: 'Pechuga de Pollo Fresca', qtyPerServing: 120, unit: 'g' }
        ]
      }
    ];
    for (const r of seedRecipes) {
      await setDoc(doc(db, 'recipes', r.id), r);
    }

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

    const seedBids: Bid[] = [
      {
        id: 'BID-01',
        tenderId: 'TND-01',
        supplierId: 'S-01',
        supplierName: 'Distribuidora Alimenticia S.A.',
        amount: 118000,
        proposalSummary: 'Ofrecemos arroz extra de primera cosecha. Entrega en 3 lotes mensuales.',
        docUrl: 'https://docs.google.com/document/d/mock_doc_id_1/edit',
        status: 'PENDING'
      }
    ];
    for (const b of seedBids) {
      await setDoc(doc(db, 'bids', b.id), b);
    }
  }

  private handleError(error: unknown, op: OperationType, path: string): never {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errInfo = {
      error: errorMsg,
      operationType: op,
      path,
      userId: auth.currentUser?.uid || null
    };
    console.error('Firestore Repository Error:', errInfo);
    throw new Error(JSON.stringify(errInfo));
  }
}
export const firestoreAdapter = new FirestoreAdapter();
