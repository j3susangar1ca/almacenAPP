import { MenuItem } from '../../../types';

export type MenuItemWithNutrition = MenuItem & {
  calories?: number;
  protein?: number;
  carbs?: number;
};

export class MenuAggregate {
  private props: MenuItemWithNutrition;

  constructor(props: MenuItemWithNutrition) {
    if (!props.calories || props.calories <= 0) {
      throw new Error('Las calorías del menú deben ser mayores a cero.');
    }
    this.props = { ...props };
  }

  getProps(): MenuItemWithNutrition {
    return this.props;
  }

  getNutritionalStatus(): 'Bajo en Calorías' | 'Balanceado' | 'Alto en Calorías' {
    const cal = this.props.calories;
    if (cal < 600) return 'Bajo en Calorías';
    if (cal > 1000) return 'Alto en Calorías';
    return 'Balanceado';
  }

  hasRequiredNutrition(): boolean {
    // Basic verification of required nutrition stats
    return (
      this.props.protein !== undefined &&
      this.props.protein > 15 &&
      this.props.carbs !== undefined &&
      this.props.carbs > 40
    );
  }
}
