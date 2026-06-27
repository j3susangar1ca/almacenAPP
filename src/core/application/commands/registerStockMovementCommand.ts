import { StockItemSchema } from '../validation/schemas';
import { StockItemAggregate } from '../../domain/entities/StockItemAggregate';
import { StockItem, UserRole } from '../../../types';

export interface RegisterStockMovementInput {
  itemId: string;
  item: StockItem;
  type: 'IN' | 'OUT';
  qty: number;
  details: string;
  userId: string;
  userName: string;
  userRole: UserRole;
}

export class RegisterStockMovementCommand {
  execute(input: RegisterStockMovementInput): { updatedItem: StockItem; prevQty: number; newQty: number } {
    // Validate input using Zod
    const validatedItem = StockItemSchema.parse(input.item) as StockItem;

    // Load domain aggregate
    const aggregate = new StockItemAggregate(validatedItem);
    const prevQty = validatedItem.stockActual;

    if (input.type === 'IN') {
      aggregate.addStock(input.qty);
    } else {
      aggregate.removeStock(input.qty);
    }

    const updatedItem = aggregate.getProps();
    const newQty = updatedItem.stockActual;

    return {
      updatedItem,
      prevQty,
      newQty
    };
  }
}
