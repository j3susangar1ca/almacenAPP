import { MonthlyProgramItem } from '../../../types';

export class GetMonthlyProgramQueries {
  /**
   * Calculates the percentage deviation between the estimated quantity and the historical average.
   * Helps users identify potential over-estimation or under-estimation of rations.
   */
  calculateHistoricalDeviation(item: MonthlyProgramItem): number {
    if (item.historicalAvg === 0) return 0;
    return ((item.estimatedQuantity - item.historicalAvg) / item.historicalAvg) * 100;
  }

  /**
   * Filters and returns the program items for a given month (e.g. "2026-07").
   */
  getProgramByMonth(items: MonthlyProgramItem[], month: string): MonthlyProgramItem[] {
    return items.filter(item => item.month === month);
  }

  /**
   * Generates a structural summary of the monthly programming items.
   */
  getProgramSummary(items: MonthlyProgramItem[]): {
    totalItems: number;
    pendingCount: number;
    approvedCount: number;
    totalEstimatedQty: number;
  } {
    return items.reduce(
      (acc, item) => {
        acc.totalItems += 1;
        acc.totalEstimatedQty += item.estimatedQuantity;
        if (item.status === 'Borrador') {
          acc.pendingCount += 1;
        } else {
          acc.approvedCount += 1;
        }
        return acc;
      },
      { totalItems: 0, pendingCount: 0, approvedCount: 0, totalEstimatedQty: 0 }
    );
  }
}
