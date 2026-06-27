import { Tender, Bid } from '../../../types';
import { Money } from '../value-objects/Money';

export class TenderAggregate {
  private props: Tender;

  constructor(props: Tender) {
    new Money(props.budgetAmount);
    this.props = { ...props };
  }

  getProps(): Tender {
    return this.props;
  }

  canAcceptBids(): boolean {
    if (this.props.status !== 'Publicada') return false;
    const deadline = new Date(this.props.deadline);
    return deadline.getTime() > Date.now();
  }

  evaluateBid(bid: Bid): { compliant: boolean; deviation: number } {
    const budget = new Money(this.props.budgetAmount);
    const bidAmount = new Money(bid.amount);
    
    const deviation = ((bid.amount - this.props.budgetAmount) / this.props.budgetAmount) * 100;
    
    // Bid is non-compliant if it exceeds the budget by more than 10%
    const compliant = deviation <= 10;
    
    return {
      compliant,
      deviation
    };
  }

  awardTender(winnerSupplierName: string, budgetCode: string): void {
    if (this.props.status !== 'Publicada' && this.props.status !== 'Evaluación') {
      throw new Error('La licitación no se encuentra en un estado apto para adjudicación.');
    }
    this.props.status = 'Adjudicada';
  }
}
