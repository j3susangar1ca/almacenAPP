export type TenderState = 'Borrador' | 'Publicada' | 'Evaluada' | 'Adjudicada' | 'Anulada';

export class ProcurementWorkflow {
  private static transitions: Record<TenderState, TenderState[]> = {
    'Borrador': ['Publicada', 'Anulada'],
    'Publicada': ['Evaluada', 'Anulada'],
    'Evaluada': ['Adjudicada', 'Anulada'],
    'Adjudicada': [], // Terminal success state
    'Anulada': []     // Terminal failure state
  };

  static isValidTransition(current: TenderState, target: TenderState): boolean {
    const allowed = this.transitions[current];
    if (!allowed) return false;
    return allowed.includes(target);
  }

  static getNextStates(current: TenderState): TenderState[] {
    return this.transitions[current] || [];
  }
}
