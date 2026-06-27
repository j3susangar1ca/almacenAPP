import React, { useState } from 'react';
import { 
  Users, 
  Truck, 
  Settings, 
  Coins, 
  Wrench,
  ShieldAlert,
  Plus
} from 'lucide-react';
import { StaffMember, Vehicle, Equipment, Budget, UserRole } from '../types';

interface ResourcesTabProps {
  staff: StaffMember[];
  vehicles: Vehicle[];
  equipment: Equipment[];
  budgets: Budget[];
  role: UserRole;
  onAddStaff: (member: StaffMember) => Promise<void>;
  onAddVehicle: (vehicle: Vehicle) => Promise<void>;
  onTriggerMaintenance: (type: 'vehicle' | 'equipment', id: string) => Promise<void>;
}

export default function ResourcesTab({
  staff,
  vehicles,
  equipment,
  budgets,
  onAddStaff,
  onAddVehicle,
  onTriggerMaintenance
}: ResourcesTabProps) {
  
  // Tab Switcher
  const [subTab, setSubTab] = useState<'staff' | 'fleet' | 'equipment' | 'budgets'>('budgets');

  // Form states
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('Almacenero');
  const [staffShift, setStaffShift] = useState('Mañana');

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [plates, setPlates] = useState('');
  const [capacity, setCapacity] = useState<number>(2000);

  // Handlers
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const member: StaffMember = {
      id: `ST-0${staff.length + 1}`,
      name: staffName,
      role: staffRole,
      shift: staffShift,
      status: 'Activo'
    };
    await onAddStaff(member);
    setStaffName('');
    setShowStaffForm(false);
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const veh: Vehicle = {
      id: `V-0${vehicles.length + 1}`,
      plates: plates,
      capacityKg: capacity,
      status: 'Disponible',
      nextMaintenance: '2026-08-15'
    };
    await onAddVehicle(veh);
    setPlates('');
    setShowVehicleForm(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Selector of Sub-context */}
      <div className="flex border-b border-[#E4E4E7] space-x-1 py-1">
        <button
          onClick={() => setSubTab('budgets')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            subTab === 'budgets' 
              ? 'border-[#18181B] text-[#18181B]' 
              : 'border-transparent text-[#71717A] hover:text-[#18181B]'
          } flex items-center space-x-1.5`}
        >
          <Coins className="h-4 w-4 text-[#18181B]" />
          <span>Partidas Presupuestarias</span>
        </button>

        <button
          onClick={() => setSubTab('staff')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            subTab === 'staff' 
              ? 'border-[#18181B] text-[#18181B]' 
              : 'border-transparent text-[#71717A] hover:text-[#18181B]'
          } flex items-center space-x-1.5`}
        >
          <Users className="h-4 w-4 text-[#18181B]" />
          <span>Gestión de Personal</span>
        </button>

        <button
          onClick={() => setSubTab('fleet')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            subTab === 'fleet' 
              ? 'border-[#18181B] text-[#18181B]' 
              : 'border-transparent text-[#71717A] hover:text-[#18181B]'
          } flex items-center space-x-1.5`}
        >
          <Truck className="h-4 w-4 text-[#18181B]" />
          <span>Flota Vehicular</span>
        </button>

        <button
          onClick={() => setSubTab('equipment')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            subTab === 'equipment' 
              ? 'border-[#18181B] text-[#18181B]' 
              : 'border-transparent text-[#71717A] hover:text-[#18181B]'
          } flex items-center space-x-1.5`}
        >
          <Settings className="h-4 w-4 text-[#18181B]" />
          <span>Cámaras & Equipos</span>
        </button>
      </div>

      {/* SUBTAB CONTENT: Budgets */}
      {subTab === 'budgets' && (
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#E4E4E7]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-2">
                <Coins className="h-4 w-4 text-[#18181B]" />
                <span>Control Analítico Presupuestario de Fondos Públicos</span>
              </h3>
              <p className="text-[10px] text-[#71717A] mt-0.5">Verificación e invariantes de sobregiro para adquisiciones de víveres</p>
            </div>
            <span className="text-[9px] bg-green-50 text-green-700 px-2 py-1 rounded-sm font-mono font-bold border border-green-200 uppercase tracking-wider">
              Invariante: No Sobregiro
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {budgets.map(b => {
              const utilized = b.committedAmount + b.executedAmount;
              const rate = (utilized / b.allocatedAmount) * 100;
              return (
                <div key={b.id} className="p-4 bg-white border border-[#E4E4E7] rounded-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] bg-[#F4F4F5] border border-[#E4E4E7] text-[#18181B] px-2 py-0.5 rounded-sm font-mono font-bold uppercase tracking-wider">{b.code}</span>
                      <h4 className="text-xs font-bold text-[#18181B] uppercase tracking-wide mt-2">{b.name}</h4>
                    </div>
                    {rate > 85 ? (
                      <span className="bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase tracking-wider flex items-center">
                        <ShieldAlert className="h-3 w-3 mr-0.5" />
                        Agotándose
                      </span>
                    ) : (
                      <span className="bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase tracking-wider">
                        Sano
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-[#71717A] font-mono">
                      <span>Uso: {rate.toFixed(1)}%</span>
                      <span>S/. {utilized.toLocaleString()} / S/. {b.allocatedAmount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-[#F4F4F5] h-1.5 rounded-sm">
                      <div 
                        className={`h-1.5 rounded-sm ${rate > 85 ? 'bg-red-600' : 'bg-[#18181B]'}`} 
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Account detail list */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-[#E4E4E7] pt-3">
                    <div className="p-2 bg-[#FAFAFA] border border-[#E4E4E7] rounded-sm">
                      <span className="text-[9px] text-[#71717A] block font-sans font-bold uppercase tracking-wider">Comprometido</span>
                      <span className="text-amber-700 font-bold">S/. {b.committedAmount.toLocaleString()}</span>
                    </div>
                    <div className="p-2 bg-[#FAFAFA] border border-[#E4E4E7] rounded-sm">
                      <span className="text-[9px] text-[#71717A] block font-sans font-bold uppercase tracking-wider">Ejecutado Real</span>
                      <span className="text-[#18181B] font-bold">S/. {b.executedAmount.toLocaleString()}</span>
                    </div>
                    <div className="p-2 bg-green-50 rounded-sm col-span-2 text-center border border-green-200">
                      <span className="text-[9px] text-[#71717A] block font-sans font-bold uppercase tracking-wider">Saldo Disponible Neto</span>
                      <span className="text-green-700 font-bold text-xs">S/. {b.availableAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT: Staff */}
      {subTab === 'staff' && (
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#E4E4E7]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-2">
              <Users className="h-4 w-4 text-[#18181B]" />
              <span>Plantilla de Personal de Almacén y Cocina</span>
            </h3>
            <button
              onClick={() => setShowStaffForm(true)}
              className="text-[10px] bg-[#18181B] hover:bg-black text-white font-bold uppercase tracking-wider py-1.5 px-3 rounded-sm flex items-center space-x-1 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Personal</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-[#E4E4E7] rounded-sm">
            <table className="w-full text-left text-xs text-[#18181B]">
              <thead className="bg-[#FAFAFA] text-[#71717A] text-[10px] uppercase font-bold tracking-wider border-b border-[#E4E4E7]">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Rol / Claim</th>
                  <th className="p-3">Turno</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F5] bg-white">
                {staff.map(member => (
                  <tr key={member.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="p-3 font-mono text-xs font-bold text-[#18181B]">{member.id}</td>
                    <td className="p-3 font-bold text-[#18181B]">{member.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-sm text-[9px] font-bold bg-[#F4F4F5] text-[#18181B] border border-[#E4E4E7] font-mono uppercase tracking-wider">
                        {member.role}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[#71717A]">{member.shift}</td>
                    <td className="p-3">
                      <span className="inline-block px-1.5 py-0.5 rounded-sm text-[8px] font-bold bg-green-50 border border-green-200 text-green-700 uppercase tracking-wider">
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT: Fleet */}
      {subTab === 'fleet' && (
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#E4E4E7]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-2">
              <Truck className="h-4 w-4 text-[#18181B]" />
              <span>Flota Logística de Vehículos de Reparto</span>
            </h3>
            <button
              onClick={() => setShowVehicleForm(true)}
              className="text-[10px] bg-[#18181B] hover:bg-black text-white font-bold uppercase tracking-wider py-1.5 px-3 rounded-sm flex items-center space-x-1 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Vehículo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map(v => (
              <div key={v.id} className="p-4 bg-white border border-[#E4E4E7] rounded-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-[#18181B] uppercase font-mono bg-[#F4F4F5] px-2 py-0.5 rounded-sm border border-[#E4E4E7]">Placas: {v.plates}</span>
                    <span className="text-xs text-[#71717A] font-mono font-bold uppercase tracking-wider">Capacidad: {v.capacityKg} kg</span>
                  </div>
                  <p className="text-[10px] text-[#71717A] mt-2 font-mono">Siguiente Mantenimiento Preventivo: {v.nextMaintenance}</p>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider ${
                    v.status === 'Disponible' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {v.status}
                  </span>
                  <button
                    onClick={() => onTriggerMaintenance('vehicle', v.id)}
                    className="text-[9px] bg-white text-[#18181B] hover:bg-[#FAFAFA] border border-[#E4E4E7] rounded-sm px-2.5 py-1 flex items-center space-x-1 font-bold uppercase tracking-wider transition-colors"
                  >
                    <Wrench className="h-3 w-3" />
                    <span>Mantenimiento</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT: Equipment */}
      {subTab === 'equipment' && (
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-2 pb-2 border-b border-[#E4E4E7]">
            <Settings className="h-4 w-4 text-[#18181B]" />
            <span>Sensores & Equipos Críticos de Refrigeración</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {equipment.map(eq => (
              <div key={eq.id} className="p-4 bg-white border border-[#E4E4E7] rounded-sm flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#18181B] uppercase tracking-wide">{eq.name}</h4>
                  <span className="text-[10px] text-[#71717A] font-mono">{eq.type} | Código: {eq.id}</span>
                  <p className="text-[10px] text-[#71717A] mt-2 font-mono">Último Mantenimiento Técnico: {eq.lastMaintenance}</p>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <span className="px-2 py-0.5 rounded-sm text-[9px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-wider">
                    {eq.status}
                  </span>
                  <button
                    onClick={() => onTriggerMaintenance('equipment', eq.id)}
                    className="text-[9px] bg-white text-[#18181B] hover:bg-[#FAFAFA] border border-[#E4E4E7] rounded-sm px-2.5 py-1 flex items-center space-x-1 font-bold uppercase tracking-wider transition-colors"
                  >
                    <Wrench className="h-3 w-3" />
                    <span>Sincronizar Sensor</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff modal */}
      {showStaffForm && (
        <div className="fixed inset-0 z-50 bg-[#18181B]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E4E7] rounded-sm w-full max-w-sm shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E4E4E7] flex justify-between items-center bg-[#FAFAFA]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B]">Alta de Personal</h3>
              <button onClick={() => setShowStaffForm(false)} className="text-[#71717A] hover:text-[#18181B] font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateStaff} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#71717A] font-bold uppercase tracking-wider">Nombre Completo</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] focus:outline-none focus:border-[#18181B]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[#71717A] font-bold uppercase tracking-wider">Rol Operacional</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as any)}
                  className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] focus:outline-none"
                >
                  <option value="Almacenero">Almacenero</option>
                  <option value="Jefe de Cocina">Jefe de Cocina</option>
                  <option value="Comprador">Comprador</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[#71717A] font-bold uppercase tracking-wider">Turno</label>
                <select
                  value={staffShift}
                  onChange={(e) => setStaffShift(e.target.value)}
                  className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] focus:outline-none"
                >
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noche">Noche</option>
                </select>
              </div>
              <button type="submit" className="bg-[#18181B] hover:bg-black text-white font-bold uppercase tracking-wider py-2 w-full rounded-sm transition-colors mt-2">
                Dar de Alta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle modal */}
      {showVehicleForm && (
        <div className="fixed inset-0 z-50 bg-[#18181B]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E4E7] rounded-sm w-full max-w-sm shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E4E4E7] flex justify-between items-center bg-[#FAFAFA]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B]">Alta de Unidad Logística</h3>
              <button onClick={() => setShowVehicleForm(false)} className="text-[#71717A] hover:text-[#18181B] font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateVehicle} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#71717A] font-bold uppercase tracking-wider">Placas Vehiculares</label>
                <input
                  type="text"
                  value={plates}
                  onChange={(e) => setPlates(e.target.value)}
                  className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] uppercase focus:outline-none focus:border-[#18181B]"
                  placeholder="E.g. ABC-123"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[#71717A] font-bold uppercase tracking-wider">Capacidad Máxima (KG)</label>
                <input
                  type="number"
                  value={capacity === 0 ? '' : capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] focus:outline-none focus:border-[#18181B]"
                  required
                />
              </div>
              <button type="submit" className="bg-[#18181B] hover:bg-black text-white font-bold uppercase tracking-wider py-2 w-full rounded-sm transition-colors mt-2">
                Registrar Unidad
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
