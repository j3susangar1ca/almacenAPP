export class Sku {
  private readonly value: string;

  constructor(value: string) {
    if (!value || typeof value !== 'string') {
      throw new Error('El SKU debe ser una cadena no vacía.');
    }
    const cleanValue = value.trim().toUpperCase();
    if (!/^SKU-[A-Z0-9-]+$/.test(cleanValue)) {
      throw new Error(`Formato de SKU inválido: "${value}". Debe comenzar con "SKU-".`);
    }
    this.value = cleanValue;
  }

  toString(): string {
    return this.value;
  }

  equals(other: Sku): boolean {
    return this.value === other.toString();
  }
}
