import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Truck, 
  Settings, 
  Coins, 
  Wrench,
  ShieldAlert,
  Plus,
  Contact,
  MessageSquare,
  Send,
  Check,
  Loader,
  RefreshCw,
  Search,
  UserPlus
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
  const [subTab, setSubTab] = useState<'staff' | 'fleet' | 'equipment' | 'budgets' | 'contacts' | 'chat'>('budgets');

  // Form states
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('Almacenero');
  const [staffShift, setStaffShift] = useState('Mañana');

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [plates, setPlates] = useState('');
  const [capacity, setCapacity] = useState<number>(2000);

  // Google Contacts States
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  
  const [newContactGiven, setNewContactGiven] = useState('');
  const [newContactFamily, setNewContactFamily] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactOrg, setNewContactOrg] = useState('');
  const [newContactTitle, setNewContactTitle] = useState('');
  const [contactsSuccess, setContactsSuccess] = useState('');

  // Google Chat States
  const [chatSpaces, setChatSpaces] = useState<any[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [spacesError, setSpacesError] = useState('');
  const [selectedSpace, setSelectedSpace] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatSuccess, setChatSuccess] = useState('');

  // Fetch Google Contacts
  const fetchContacts = async () => {
    const token = localStorage.getItem('google_access_token');
    if (!token) {
      setContactsError('No se detectó un token de acceso de Google. Inicie sesión con Google en la barra superior.');
      return;
    }
    setLoadingContacts(true);
    setContactsError('');
    setContactsSuccess('');
    try {
      const res = await fetch('/api/workspace/contacts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts || []);
      } else {
        setContactsError(data.error || 'Error al listar los contactos.');
      }
    } catch (err: any) {
      setContactsError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Fetch Google Chat Spaces
  const fetchSpaces = async () => {
    const token = localStorage.getItem('google_access_token');
    if (!token) {
      setSpacesError('No se detectó un token de acceso de Google. Inicie sesión con Google en la barra superior.');
      return;
    }
    setLoadingSpaces(true);
    setSpacesError('');
    setChatSuccess('');
    try {
      const res = await fetch('/api/workspace/chat-spaces', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setChatSpaces(data.spaces || []);
        if (data.spaces?.length > 0 && !selectedSpace) {
          setSelectedSpace(data.spaces[0].name);
        }
      } else {
        setSpacesError(data.error || 'Error al listar los espacios de Chat.');
      }
    } catch (err: any) {
      setSpacesError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoadingSpaces(false);
    }
  };

  // Create Google Contact (With required user confirmation!)
  const handleCreateGoogleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirmed = window.confirm(
      `¿Está seguro de que desea crear un nuevo contacto en Google Contacts para "${newContactGiven} ${newContactFamily}"?`
    );
    if (!confirmed) return;

    const token = localStorage.getItem('google_access_token');
    if (!token) {
      setContactsError('No se detectó un token de acceso de Google.');
      return;
    }

    setLoadingContacts(true);
    setContactsError('');
    setContactsSuccess('');
    try {
      const res = await fetch('/api/workspace/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          givenName: newContactGiven,
          familyName: newContactFamily,
          email: newContactEmail,
          phone: newContactPhone,
          organization: newContactOrg,
          title: newContactTitle
        })
      });
      const data = await res.json();
      if (data.success) {
        setContactsSuccess(`¡Contacto "${newContactGiven} ${newContactFamily}" creado exitosamente en Google Contacts!`);
        setShowNewContactForm(false);
        // Clear fields
        setNewContactGiven('');
        setNewContactFamily('');
        setNewContactEmail('');
        setNewContactPhone('');
        setNewContactOrg('');
        setNewContactTitle('');
        // Refresh list
        fetchContacts();
      } else {
        setContactsError(data.error || 'Error al crear el contacto.');
      }
    } catch (err: any) {
      setContactsError(err.message || 'Error de conexión.');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Send Google Chat Message (With required user confirmation!)
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const space = chatSpaces.find(s => s.name === selectedSpace);
    const spaceLabel = space ? space.displayName : selectedSpace;
    const confirmed = window.confirm(
      `¿Está seguro de que desea enviar este mensaje al espacio "${spaceLabel}" de Google Chat?`
    );
    if (!confirmed) return;

    const token = localStorage.getItem('google_access_token');
    if (!token) {
      setSpacesError('No se detectó un token de acceso de Google.');
      return;
    }

    setSendingMessage(true);
    setSpacesError('');
    setChatSuccess('');
    try {
      const res = await fetch('/api/workspace/chat-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          spaceName: selectedSpace,
          text: chatMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        setChatSuccess('¡Mensaje enviado exitosamente a Google Chat!');
        setChatMessage('');
      } else {
        setSpacesError(data.error || 'Error al enviar el mensaje.');
      }
    } catch (err: any) {
      setSpacesError(err.message || 'Error de conexión.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Import Google Contact to ERP Staff
  const handleImportToStaff = (displayName: string) => {
    setStaffName(displayName);
    setStaffRole('Almacenero');
    setStaffShift('Mañana');
    setSubTab('staff');
    setShowStaffForm(true);
  };

  // Fetch lists automatically when subtab opens
  useEffect(() => {
    if (subTab === 'contacts') {
      fetchContacts();
    } else if (subTab === 'chat') {
      fetchSpaces();
    }
  }, [subTab]);

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

        <button
          onClick={() => setSubTab('contacts')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            subTab === 'contacts' 
              ? 'border-[#18181B] text-[#18181B]' 
              : 'border-transparent text-[#71717A] hover:text-[#18181B]'
          } flex items-center space-x-1.5`}
        >
          <Contact className="h-4 w-4 text-[#18181B]" />
          <span>Google Contacts</span>
        </button>

        <button
          onClick={() => setSubTab('chat')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            subTab === 'chat' 
              ? 'border-[#18181B] text-[#18181B]' 
              : 'border-transparent text-[#71717A] hover:text-[#18181B]'
          } flex items-center space-x-1.5`}
        >
          <MessageSquare className="h-4 w-4 text-[#18181B]" />
          <span>Google Chat</span>
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

      {/* SUBTAB CONTENT: Contacts */}
      {subTab === 'contacts' && (
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-2 border-b border-[#E4E4E7] gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-2">
                <Contact className="h-4 w-4 text-[#18181B]" />
                <span>Google Contacts - Directorio de Enlace Externo</span>
              </h3>
              <p className="text-[10px] text-[#71717A] mt-0.5">Gestión y sincronización de contactos de Google Workspace para proveedores y personal</p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowNewContactForm(true)}
                className="text-[10px] bg-[#18181B] hover:bg-black text-white font-bold uppercase tracking-wider py-1.5 px-3 rounded-sm flex items-center space-x-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nuevo Contacto</span>
              </button>
              <button
                onClick={fetchContacts}
                disabled={loadingContacts}
                className="text-[10px] bg-white border border-[#E4E4E7] hover:bg-[#FAFAFA] text-[#18181B] font-bold uppercase tracking-wider py-1.5 px-3 rounded-sm flex items-center space-x-1 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingContacts ? 'animate-spin' : ''}`} />
                <span>Sincronizar</span>
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {contactsError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-sm">
              {contactsError}
            </div>
          )}

          {contactsSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-sm flex items-center space-x-1.5">
              <Check className="h-4 w-4" />
              <span>{contactsSuccess}</span>
            </div>
          )}

          {/* New Contact Form Modal / Inline Box */}
          {showNewContactForm && (
            <form onSubmit={handleCreateGoogleContact} className="p-4 bg-[#FAFAFA] border border-[#E4E4E7] rounded-sm space-y-4 text-xs">
              <h4 className="font-bold text-[#18181B] uppercase tracking-wider text-[10px] pb-1.5 border-b border-[#E4E4E7]">
                Registrar Nuevo Contacto en Google Contacts
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[#71717A] font-bold uppercase tracking-wider block">Nombre</label>
                  <input
                    type="text"
                    value={newContactGiven}
                    onChange={(e) => setNewContactGiven(e.target.value)}
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    placeholder="E.g. Juan"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#71717A] font-bold uppercase tracking-wider block">Apellido</label>
                  <input
                    type="text"
                    value={newContactFamily}
                    onChange={(e) => setNewContactFamily(e.target.value)}
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    placeholder="E.g. Pérez"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#71717A] font-bold uppercase tracking-wider block">Email</label>
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    placeholder="E.g. juan.perez@compañia.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#71717A] font-bold uppercase tracking-wider block">Teléfono / Celular</label>
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    placeholder="E.g. +51 987654321"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#71717A] font-bold uppercase tracking-wider block">Organización / Empresa</label>
                  <input
                    type="text"
                    value={newContactOrg}
                    onChange={(e) => setNewContactOrg(e.target.value)}
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    placeholder="E.g. Distribuidora de Alimentos S.A."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#71717A] font-bold uppercase tracking-wider block">Cargo / Título</label>
                  <input
                    type="text"
                    value={newContactTitle}
                    onChange={(e) => setNewContactTitle(e.target.value)}
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    placeholder="E.g. Gerente de Logística"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setShowNewContactForm(false)}
                  className="bg-white border border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5] px-4 py-2 rounded-sm font-bold uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingContacts}
                  className="bg-[#18181B] hover:bg-black text-white px-5 py-2 rounded-sm font-bold uppercase tracking-wider transition-colors flex items-center space-x-1"
                >
                  {loadingContacts ? <Loader className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  <span>Crear en Google Contacts</span>
                </button>
              </div>
            </form>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#71717A]" />
            <input
              type="text"
              placeholder="Buscar por nombre, email, teléfono o empresa..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-[#E4E4E7] rounded-sm w-full text-xs text-[#18181B] focus:outline-none focus:border-[#18181B] transition-colors"
            />
          </div>

          {loadingContacts ? (
            <div className="flex items-center justify-center space-x-2 py-12 text-xs text-[#71717A]">
              <Loader className="h-5 w-5 animate-spin text-[#18181B]" />
              <span>Conectando con Google Contacts API...</span>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#E4E4E7] rounded-sm">
              <table className="w-full text-left text-xs text-[#18181B]">
                <thead className="bg-[#FAFAFA] text-[#71717A] text-[10px] uppercase font-bold tracking-wider border-b border-[#E4E4E7]">
                  <tr>
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Teléfono</th>
                    <th className="p-3">Organización / Cargo</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5] bg-white">
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#71717A] italic">
                        No se encontraron contactos en Google Contacts. Presione "Sincronizar" o cree un nuevo contacto.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const filtered = contacts.filter(c => {
                        const name = c.names?.[0]?.displayName || '';
                        const email = c.emailAddresses?.[0]?.value || '';
                        const phone = c.phoneNumbers?.[0]?.value || '';
                        const org = c.organizations?.[0]?.name || '';
                        const term = contactSearch.toLowerCase();
                        return (
                          name.toLowerCase().includes(term) ||
                          email.toLowerCase().includes(term) ||
                          phone.toLowerCase().includes(term) ||
                          org.toLowerCase().includes(term)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-[#71717A] italic">
                              Ningún contacto coincide con la búsqueda "{contactSearch}".
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((c, idx) => {
                        const name = c.names?.[0]?.displayName || 'Sin nombre';
                        const email = c.emailAddresses?.[0]?.value || '-';
                        const phone = c.phoneNumbers?.[0]?.value || '-';
                        const orgName = c.organizations?.[0]?.name || '';
                        const orgTitle = c.organizations?.[0]?.title || '';
                        const hasOrg = orgName || orgTitle;

                        return (
                          <tr key={c.resourceName || idx} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="p-3 font-bold text-[#18181B]">{name}</td>
                            <td className="p-3 font-mono text-[#71717A]">{email}</td>
                            <td className="p-3 font-mono text-[#71717A]">{phone}</td>
                            <td className="p-3">
                              {hasOrg ? (
                                <div>
                                  <span className="font-bold text-[#18181B] block text-[11px]">{orgName}</span>
                                  {orgTitle && <span className="text-[10px] text-[#71717A]">{orgTitle}</span>}
                                </div>
                              ) : (
                                <span className="text-[#71717A]">-</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleImportToStaff(name)}
                                className="text-[9px] bg-white text-[#18181B] hover:bg-[#FAFAFA] border border-[#E4E4E7] rounded-sm px-2.5 py-1.5 flex items-center space-x-1 font-bold uppercase tracking-wider transition-colors ml-auto"
                                title="Importar este contacto para dar de alta en el Personal local del ERP"
                              >
                                <UserPlus className="h-3 w-3" />
                                <span>Importar a Personal</span>
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB CONTENT: Google Chat */}
      {subTab === 'chat' && (
        <div className="bg-white border border-[#E4E4E7] p-5 rounded-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#E4E4E7]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-[#18181B]" />
                <span>Google Chat - Central de Alertas & Notificaciones</span>
              </h3>
              <p className="text-[10px] text-[#71717A] mt-0.5">Enlace de mensajería interactivo para el equipo operacional en Google Workspace Spaces</p>
            </div>
            
            <button
              onClick={fetchSpaces}
              disabled={loadingSpaces}
              className="text-[10px] bg-white border border-[#E4E4E7] hover:bg-[#FAFAFA] text-[#18181B] font-bold uppercase tracking-wider py-1.5 px-3 rounded-sm flex items-center space-x-1 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingSpaces ? 'animate-spin' : ''}`} />
              <span>Sincronizar Canales</span>
            </button>
          </div>

          {/* Feedback messages */}
          {spacesError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-sm">
              {spacesError}
            </div>
          )}

          {chatSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-sm flex items-center space-x-1.5">
              <Check className="h-4 w-4" />
              <span>{chatSuccess}</span>
            </div>
          )}

          {loadingSpaces ? (
            <div className="flex items-center justify-center space-x-2 py-12 text-xs text-[#71717A]">
              <Loader className="h-5 w-5 animate-spin text-[#18181B]" />
              <span>Cargando espacios activos en Google Chat...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form and Template panel */}
              <div className="lg:col-span-2 space-y-4">
                <form onSubmit={handleSendChatMessage} className="bg-[#FAFAFA] border border-[#E4E4E7] p-4 rounded-sm space-y-4 text-xs">
                  <h4 className="font-bold text-[#18181B] uppercase tracking-wider text-[10px] pb-1 border-b border-[#E4E4E7]">
                    Despachar Notificación Manual / Boletín
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-[#71717A] font-bold uppercase tracking-wider block">1. Seleccionar Espacio de Destino (Space)</label>
                    <select
                      value={selectedSpace}
                      onChange={(e) => setSelectedSpace(e.target.value)}
                      className="bg-white border border-[#E4E4E7] p-2 w-full text-[#18181B] rounded-sm focus:outline-none"
                      required
                    >
                      <option value="">-- Seleccionar Espacio --</option>
                      {chatSpaces.map(s => (
                        <option key={s.name} value={s.name}>
                          {s.displayName} ({s.type === 'ROOM' ? 'Sala' : 'Mensaje Directo'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#71717A] font-bold uppercase tracking-wider block">2. Contenido del Mensaje</label>
                    <textarea
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Escriba aquí la alerta o anuncio oficial..."
                      rows={4}
                      className="bg-white border border-[#E4E4E7] rounded-sm p-2.5 w-full text-[#18181B] focus:outline-none focus:border-[#18181B] transition-colors"
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-[#E4E4E7]">
                    <button
                      type="submit"
                      disabled={sendingMessage || !selectedSpace || !chatMessage}
                      className="bg-[#18181B] hover:bg-black disabled:bg-[#F4F4F5] disabled:text-[#71717A] text-white px-5 py-2 rounded-sm font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5"
                    >
                      {sendingMessage ? (
                        <>
                          <Loader className="h-3.5 w-3.5 animate-spin" />
                          <span>Transmitiendo...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Transmitir Alerta</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Templates sidebar */}
              <div className="bg-white border border-[#E4E4E7] p-4 rounded-sm space-y-4">
                <h4 className="font-bold text-[#18181B] uppercase tracking-wider text-[10px] pb-1 border-b border-[#E4E4E7]">
                  Plantillas Operacionales Rápidas
                </h4>
                <p className="text-[10px] text-[#71717A]">Haga clic en una plantilla para precargar el mensaje:</p>

                <div className="space-y-2">
                  <button
                    onClick={() => setChatMessage(`🚨 ALERTA DE PRESUPUESTO CRÍTICO - SIGAL V2 ERP 🚨\\nLa partida presupuestal P-101 (Víveres Básicos) ha superado el 85% de ejecución. Por favor, coordinadores de licitaciones, detener nuevos procesos de concurso público hasta ampliación presupuestal oficial.`)}
                    className="w-full text-left p-2.5 rounded-sm border border-[#E4E4E7] hover:border-[#18181B] text-[11px] font-mono hover:bg-[#FAFAFA] transition-all block text-xs"
                  >
                    <span className="font-bold text-red-700 block mb-1">🚨 Presupuesto Crítico</span>
                    Mensaje de alerta de sobregiro presupuestario.
                  </button>

                  <button
                    onClick={() => setChatMessage(`📦 ALERTA DE STOCK MÍNIMO / REAPROVISIONAMIENTO 📦\\nSe ha detectado que múltiples ítems críticos en el Almacén Central de SIGAL han caído por debajo del stock mínimo estipulado para la ración nutricional. Se requiere acción urgente del Comprador.`)}
                    className="w-full text-left p-2.5 rounded-sm border border-[#E4E4E7] hover:border-[#18181B] text-[11px] font-mono hover:bg-[#FAFAFA] transition-all block text-xs"
                  >
                    <span className="font-bold text-[#18181B] block mb-1">📦 Stock Mínimo Almacén</span>
                    Mensaje de reaprovisionamiento para Compradores.
                  </button>

                  <button
                    onClick={() => setChatMessage(`⚙️ RECORDATORIO: MANTENIMIENTO PREVENTIVO DE FLOTA ⚙️\\nSe solicita a los conductores y personal logístico revisar la programación de mantenimiento de las unidades de transporte de víveres en el subtab "Flota Vehicular" para evitar interrupciones de entrega.`)}
                    className="w-full text-left p-2.5 rounded-sm border border-[#E4E4E7] hover:border-[#18181B] text-[11px] font-mono hover:bg-[#FAFAFA] transition-all block text-xs"
                  >
                    <span className="font-bold text-amber-700 block mb-1">⚙️ Mantenimiento Logístico</span>
                    Recordatorio de mantenimiento preventivo de flota.
                  </button>
                </div>
              </div>
            </div>
          )}
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
