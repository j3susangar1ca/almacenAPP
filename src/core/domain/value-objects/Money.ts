export class Money {
  private readonly amount: number;

  constructor(amount: number) {
    if (amount < 0) {
      throw new Error('El monto no puede ser negativo.');
    }
    this.amount = Number(amount.toFixed(2));
  }

  getAmount(): number {
    return this.amount;
  }

  formatted(currencyCode = 'S/. '): string {
    return `${currencyCode}${this.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  }

  add(other: Money): Money {
    return new Money(this.amount + other.getAmount());
  }

  subtract(other: Money): Money {
    if (this.amount < other.getAmount()) {
      throw new Error('Fondos insuficientes para realizar la sustracción.');
    }
    return new Money(this.amount - other.getAmount());
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor);
  }
}
