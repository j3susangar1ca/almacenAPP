import { Sku } from '../value-objects/Sku';
import { Money } from '../value-objects/Money';
import { StockItem } from '../../../types';

export class StockItemAggregate {
  private props: StockItem;

  constructor(props: StockItem) {
    // Validate SKU using value object
    new Sku(props.sku);
    // Validate UnitCost using value object
    new Money(props.unitCost);
    this.props = { ...props };
  }

  getProps(): StockItem {
    return this.props;
  }

  isBelowMinimum(): boolean {
    return this.props.stockActual < this.props.stockMinimo;
  }

  isCloseToExpiration(daysThreshold = 15): boolean {
    if (!this.props.expirationDate) return false;
    const expDate = new Date(this.props.expirationDate);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= daysThreshold;
  }

  calculateTotalValue(): Money {
    const cost = new Money(this.props.unitCost);
    return cost.multiply(this.props.stockActual);
  }

  addStock(qty: number): void {
    if (qty <= 0) throw new Error('La cantidad a añadir debe ser mayor a cero.');
    this.props.stockActual += qty;
  }

  removeStock(qty: number): void {
    if (qty <= 0) throw new Error('La cantidad a retirar debe ser mayor a cero.');
    if (this.props.stockActual < qty) {
      throw new Error(`Stock insuficiente. Stock actual: ${this.props.stockActual}, solicitado: ${qty}`);
    }
    this.props.stockActual -= qty;
  }
}
