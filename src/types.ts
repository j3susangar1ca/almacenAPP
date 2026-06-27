/**
 * SIGAL V2 Enterprise ERP - Domain Types (DDD)
 */

export type UserRole = 'Administrador' | 'Almacenero' | 'Comprador' | 'Jefe de Cocina' | 'Auditor';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

// --- InventoryContext ---
export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export type CategoryType = 'Perecederos' | 'No Perecederos' | 'Refrigerados';

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: CategoryType;
  unit: string;
  unitCost: number;
  stockActual: number;
  stockMinimo: number;
  supplierId: string;
  batchCode: string;
  expirationDate: string; // ISO Date YYYY-MM-DD
  warehouseId: string;
}

export interface StockTransaction {
  id: string;
  timestamp: string; // ISO 8601
  itemId: string;
  itemName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  previousQty: number;
  newQty: number;
  userId: string;
  userName: string;
  userRole: UserRole;
  details: string;
}

export interface Batch {
  id: string;
  code: string;
  expirationDate: string;
  itemId: string;
  itemName: string;
  warehouseId: string;
  quantity: number;
  status: 'ACTIVE' | 'NEAR_EXPIRATION' | 'EXPIRED';
}

// --- ProcurementContext ---
export type TenderStatus = 'Borrador' | 'Publicada' | 'Evaluación' | 'Adjudicada' | 'Cerrada' | 'Desierta';

export interface TenderItem {
  name: string;
  quantity: number;
  targetUnitCost: number;
}

export interface Tender {
  id: string;
  title: string;
  description: string;
  budgetCode: string; // Reference to Budget Partida
  budgetAmount: number;
  status: TenderStatus;
  deadline: string; // YYYY-MM-DD
  winnerSupplierId?: string;
  winnerSupplierName?: string;
  finalCost?: number;
  legalJustification?: string;
  items: TenderItem[];
  createdAt: string;
}

export interface Bid {
  id: string;
  tenderId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  proposalSummary: string;
  docUrl: string;
  status: 'PENDING' | 'REJECTED' | 'ACCEPTED';
}

export interface Supplier {
  id: string;
  name: string;
  ruc: string;
  contactEmail: string;
  category: string;
}

// --- NutritionContext ---
export interface RecipeIngredient {
  sku: string;
  name: string;
  qtyPerServing: number; // in grams or units
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
}

export interface MenuItem {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'Desayuno' | 'Almuerzo' | 'Cena';
  recipeId: string;
  recipeName: string;
  servings: number;
  status: 'Programado' | 'Servido/Aprobado';
  approvedBy?: string;
}

// --- ResourcesContext ---
export interface Budget {
  id: string;
  code: string; // e.g. "P-101" (Víveres), "P-102" (Logística)
  name: string;
  allocatedAmount: number;
  committedAmount: number;
  executedAmount: number;
  availableAmount: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: UserRole;
  shift: string; // e.g. "Mañana", "Tarde", "Noche"
  status: 'Activo' | 'Inactivo';
}

export interface Vehicle {
  id: string;
  plates: string;
  capacityKg: number;
  status: 'Disponible' | 'En Ruta' | 'Mantenimiento';
  nextMaintenance: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  status: 'Operativo' | 'Mantenimiento' | 'Falla';
  lastMaintenance: string;
}

// --- MonthlyProgramContext ---
export interface MonthlyProgramItem {
  id: string;
  month: string; // YYYY-MM
  sku: string;
  name: string;
  estimatedQuantity: number;
  historicalAvg: number;
  status: 'Borrador' | 'Orden de Compra Aprobada';
  approvedAt?: string;
  purchaseOrderId?: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitCost: number;
  }>;
  totalAmount: number;
  status: 'Borrador' | 'Enviado' | 'Recibido';
  budgetCode: string;
  createdAt: string;
}

// --- AuditLog ---
export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  endpoint: string;
  before: any;
  after: any;
}
