/**
 * SIGAL V2 Enterprise ERP - Firestore Service Adapter proxy
 */

import { firestoreAdapter } from '../core/infrastructure/persistence/FirestoreAdapter';
import { UserRole } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export async function getFirestoreCollection<T>(collectionName: string): Promise<T[]> {
  return firestoreAdapter.getCollection<T>(collectionName);
}

export const getFirestoreData = getFirestoreCollection;

export async function addFirestoreDocument(collectionName: string, data: any) {
  return firestoreAdapter.addDocument(collectionName, data);
}

export async function updateFirestoreDocument(collectionName: string, id: string, updates: any) {
  return firestoreAdapter.updateDocument(collectionName, id, updates);
}

export async function logAuditEvent(
  userId: string,
  userName: string,
  userRole: UserRole,
  action: string,
  endpoint: string,
  before: any = null,
  after: any = null
) {
  return firestoreAdapter.logAuditEvent(userId, userName, userRole, action, endpoint, before, after);
}

export async function executeStockMovementTransaction(
  itemId: string,
  type: 'IN' | 'OUT',
  qty: number,
  details: string,
  userEmail: string,
  userRole: UserRole
): Promise<{ success: boolean; msg: string }> {
  return firestoreAdapter.executeStockMovement(itemId, type, qty, details, userEmail, userRole);
}

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
  return firestoreAdapter.executeStockMovement(itemId, type, qty, details, userId, userRole);
}

export async function seedDatabaseIfEmpty() {
  return firestoreAdapter.seedDatabaseIfEmpty();
}

export const seedEnterpriseDatabase = seedDatabaseIfEmpty;
