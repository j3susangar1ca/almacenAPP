import { Budget } from '../../../types';

export class BudgetAggregate {
  private props: Budget;

  constructor(props: Budget) {
    this.props = { ...props };
    this.recalculateAvailable();
  }

  private recalculateAvailable(): void {
    const calculatedAvailable = this.props.allocatedAmount - this.props.committedAmount - this.props.executedAmount;
    this.props.availableAmount = Math.max(0, calculatedAvailable);
  }

  getProps(): Budget {
    return this.props;
  }

  /**
   * Commits a portion of the allocated budget (e.g. when initiating a tender or purchase order).
   * Verifies that the amount is available.
   */
  commitAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('El monto a comprometer debe ser mayor a cero.');
    }
    if (this.props.availableAmount < amount) {
      throw new Error(`Fondos insuficientes en la partida ${this.props.code}. Disponible: S/. ${this.props.availableAmount}, Requerido: S/. ${amount}`);
    }
    this.props.committedAmount += amount;
    this.recalculateAvailable();
  }

  /**
   * Executes a committed portion of the budget (e.g. when the order is fulfilled/received).
   */
  executeCommittedAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('El monto a ejecutar debe ser mayor a cero.');
    }
    if (this.props.committedAmount < amount) {
      throw new Error(`Monto comprometido insuficiente para ejecutar S/. ${amount}. Comprometido actual: S/. ${this.props.committedAmount}`);
    }
    this.props.committedAmount -= amount;
    this.props.executedAmount += amount;
    this.recalculateAvailable();
  }

  /**
   * Releases a committed amount back to the available budget (e.g. when a tender is declared desert or cancelled).
   */
  releaseCommittedAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('El monto a liberar debe ser mayor a cero.');
    }
    const releaseQty = Math.min(this.props.committedAmount, amount);
    this.props.committedAmount -= releaseQty;
    this.recalculateAvailable();
  }
}
