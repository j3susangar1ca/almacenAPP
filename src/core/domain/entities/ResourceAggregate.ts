import { StaffMember, Vehicle, Equipment } from '../../../types';

export class ResourceAggregate {
  /**
   * Validates and updates a Staff Member shift assignment.
   */
  static assignStaffShift(staff: StaffMember, newShift: string): StaffMember {
    const validShifts = ['Mañana', 'Tarde', 'Noche'];
    if (!validShifts.includes(newShift)) {
      throw new Error(`Turno inválido. Los turnos válidos son: ${validShifts.join(', ')}.`);
    }
    if (!staff.name || staff.name.trim() === '') {
      throw new Error('El nombre del personal no puede estar vacío.');
    }
    return {
      ...staff,
      shift: newShift
    };
  }

  /**
   * Triggers or schedules a preventive maintenance for a delivery vehicle.
   */
  static scheduleVehicleMaintenance(vehicle: Vehicle, dateStr: string): Vehicle {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error('La fecha de mantenimiento preventivo no es válida.');
    }
    if (date.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
      throw new Error('La fecha del próximo mantenimiento preventivo no puede estar en el pasado.');
    }
    return {
      ...vehicle,
      status: 'Mantenimiento',
      nextMaintenance: dateStr
    };
  }

  /**
   * Completes a vehicle's maintenance, resetting status to 'Disponible'.
   */
  static completeVehicleMaintenance(vehicle: Vehicle, nextMaintenanceDateStr: string): Vehicle {
    return {
      ...vehicle,
      status: 'Disponible',
      nextMaintenance: nextMaintenanceDateStr
    };
  }

  /**
   * Triggers preventive maintenance for high-value equipment.
   */
  static triggerEquipmentMaintenance(equipment: Equipment): Equipment {
    return {
      ...equipment,
      status: 'Mantenimiento',
      lastMaintenance: new Date().toISOString().split('T')[0]
    };
  }
}
