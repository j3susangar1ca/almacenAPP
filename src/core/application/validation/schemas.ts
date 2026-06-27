import { z } from 'zod';

export const StockItemSchema = z.object({
  id: z.string().default(() => 'item_' + Math.random().toString(36).substr(2, 9)),
  sku: z.string().startsWith('SKU-', { message: 'El SKU debe comenzar con SKU-' }),
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  category: z.enum(['Perecederos', 'No Perecederos', 'Refrigerados'] as any),
  unit: z.string(),
  unitCost: z.number().nonnegative(),
  stockActual: z.number().int().nonnegative(),
  stockMinimo: z.number().int().nonnegative(),
  supplierId: z.string(),
  batchCode: z.string().default(''),
  expirationDate: z.string().default(''),
  warehouseId: z.string()
});

export const StockTransactionSchema = z.object({
  id: z.string().optional(),
  timestamp: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  sku: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string(),
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().int().positive(),
  previousQty: z.number().int().nonnegative(),
  newQty: z.number().int().nonnegative(),
  userId: z.string(),
  userName: z.string(),
  userRole: z.string(),
  details: z.string()
});

export const TenderSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(5),
  description: z.string().min(10),
  budgetCode: z.string(),
  budgetAmount: z.number().positive(),
  status: z.string(),
  deadline: z.string(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().positive(),
    targetUnitCost: z.number().positive()
  })),
  createdAt: z.string()
});

export const PurchaseOrderSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  items: z.array(z.object({
    sku: z.string(),
    name: z.string(),
    quantity: z.number().positive(),
    unitCost: z.number().positive()
  })),
  totalAmount: z.number().nonnegative(),
  status: z.enum(['Borrador', 'Enviado', 'Recibido']),
  budgetCode: z.string(),
  createdAt: z.string()
});
