import { StockItem } from '../../../types';
import { StockItemAggregate } from '../../domain/entities/StockItemAggregate';

export class GetInventoryQueries {
  // Query to get items under minimum stock levels
  getCriticalStockItems(items: StockItem[]): StockItem[] {
    return items
      .map(item => new StockItemAggregate(item))
      .filter(aggregate => aggregate.isBelowMinimum())
      .map(aggregate => aggregate.getProps());
  }

  // Query to get items nearing expiration (within 15 days)
  getExpiringStockItems(items: StockItem[], daysThreshold = 15): StockItem[] {
    return items
      .map(item => new StockItemAggregate(item))
      .filter(aggregate => aggregate.isCloseToExpiration(daysThreshold))
      .map(aggregate => aggregate.getProps());
  }

  // Query to calculate the overall valuation of current stock
  getTotalInventoryValuation(items: StockItem[]): number {
    return items
      .map(item => new StockItemAggregate(item))
      .reduce((sum, agg) => sum + agg.calculateTotalValue().getAmount(), 0);
  }
}
