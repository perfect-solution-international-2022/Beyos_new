/**
 * Cost model shared by the Sales, Profit & Loss and Lost Profit reports so
 * their figures stay comparable: the recorded production cost when we have
 * one, otherwise a 55%-of-unit-price estimate.
 */
export const COST_ESTIMATE_RATIO = 0.55;

export function estimateUnitCost(unitPrice: number, productionCost: string | number | null | undefined): number {
  return productionCost == null ? unitPrice * COST_ESTIMATE_RATIO : Number(productionCost);
}
