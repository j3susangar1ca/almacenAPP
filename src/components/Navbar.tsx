import React from 'react';
import { 
  Warehouse as WarehouseIcon, 
  LogOut, 
  User as UserIcon, 
  Shield, 
  Database, 
  Settings, 
  CloudAlert,
  Menu as MenuIcon,
  Sparkles
} from 'lucide-react';
import { User } from 'firebase/auth';
import { UserRole, Warehouse } from '../types';

interface NavbarProps {
  user: User | null;
  role: UserRole;
  onChangeRole: (role: UserRole) => void;
  needsAuth: boolean;
  onLogin: () => void;
  onLogout: () => void;
  activeWarehouse: Warehouse;
  onWarehouseChange: (w: Warehouse) => void;
  warehouses: Warehouse[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  syncStatus: { status: 'idle' | 'syncing' | 'synced' | 'warning'; msg: string };
  isOnline: boolean;
}

export default function Navbar({
  user,
  role,
  onChangeRole,
  needsAuth,
  onLogin,
  onLogout,
  activeWarehouse,
  onWarehouseChange,
  warehouses,
  activeTab,
  onTabChange,
  syncStatus,
  isOnline
}: NavbarProps) {
  const tabs = [
    { id: 'dashboard', name: 'Observabilidad' },
    { id: 'inventory', name: 'Inventario & Kardex' },
    { id: 'procurement', name: 'Licitaciones Públicas' },
    { id: 'nutrition', name: 'Menús & Nutrición' },
    { id: 'resources', name: 'Recursos & Presupuesto' },
    { id: 'orders', name: 'Programación Mensual' },
  ];

  return (
    <header className="bg-white border-b border-[#E4E4E7] text-[#18181B] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#18181B] rounded flex items-center justify-center text-white font-bold text-xs">
              S2
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tighter uppercase flex items-center space-x-1 text-[#18181B]">
                <span>SIGAL</span> 
                <span className="text-[10px] bg-[#F4F4F5] text-[#71717A] px-1.5 py-0.5 rounded border border-[#E4E4E7] font-normal">v2.0</span>
              </h1>
              <p className="text-[9px] text-[#71717A] font-mono tracking-wider uppercase">Víveres Públicos & Licitaciones</p>
            </div>
          </div>

          {/* Active Warehouse Context Selector */}
          <div className="hidden md:flex items-center space-x-2 bg-white border border-[#E4E4E7] px-3 py-1 rounded-sm">
            <WarehouseIcon className="h-3.5 w-3.5 text-[#71717A]" />
            <span className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider">Almacén Activo:</span>
            <select
              value={activeWarehouse.id}
              onChange={(e) => {
                const selected = warehouses.find(w => w.id === e.target.value);
                if (selected) onWarehouseChange(selected);
              }}
              className="bg-transparent text-xs text-[#18181B] font-semibold border-none focus:ring-0 cursor-pointer p-0"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id} className="bg-white text-[#18181B] text-xs">
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Workspace Sincronización Indicator */}
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-green-600' : 'bg-amber-500'}`}></span>
            </span>
            <span className="hidden sm:inline text-[10px] text-[#71717A] font-mono uppercase tracking-wider font-semibold">
              {isOnline ? 'Nube' : 'Offline'}
            </span>
            
            {syncStatus.status !== 'idle' && (
              <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase border ${
                syncStatus.status === 'syncing' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' :
                syncStatus.status === 'synced' ? 'bg-green-50 text-green-700 border-green-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <CloudAlert className="h-3 w-3" />
                <span className="max-w-[120px] truncate">{syncStatus.msg}</span>
              </div>
            )}
          </div>

          {/* User Sign-In with Google & RBAC Simulator Selector */}
          <div className="flex items-center space-x-4">
            {needsAuth ? (
              <button
                onClick={onLogin}
                className="bg-[#18181B] text-white hover:bg-black transition-colors px-3 py-1 rounded-sm flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider shadow-sm"
              >
                <span>Acceso Corporativo</span>
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                {/* Simulated RBAC claim select */}
                <div className="flex items-center space-x-1.5 bg-white border border-[#E4E4E7] rounded-sm px-2.5 py-1">
                  <Shield className="h-3 w-3 text-[#18181B]" />
                  <span className="text-[9px] text-[#71717A] font-bold uppercase tracking-wider">Rol:</span>
                  <select
                    value={role}
                    onChange={(e) => onChangeRole(e.target.value as UserRole)}
                    className="bg-transparent text-[10px] text-[#18181B] font-bold border-none focus:ring-0 p-0 cursor-pointer"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Almacenero">Almacenero</option>
                    <option value="Comprador">Comprador</option>
                    <option value="Jefe de Cocina">Jefe de Cocina</option>
                    <option value="Auditor">Auditor (Solo Lectura)</option>
                  </select>
                </div>

                {/* Google user info */}
                <div className="hidden lg:flex items-center space-x-2">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="h-6 w-6 rounded-full border border-[#E4E4E7]" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="h-6 w-6 bg-[#F4F4F5] rounded-full p-1 text-[#18181B] border border-[#E4E4E7]" />
                  )}
                  <span className="text-xs text-[#18181B] font-medium max-w-[120px] truncate">{user?.displayName || user?.email}</span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="hover:bg-[#F4F4F5] p-1.5 rounded-sm text-[#71717A] hover:text-[#18181B] border border-transparent hover:border-[#E4E4E7] transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Tabs navigation under header */}
      <nav className="bg-[#FAFAFA] border-t border-[#E4E4E7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-1.5 overflow-x-auto scrollbar-none">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-sm font-bold transition-all duration-200 whitespace-nowrap border ${
                  activeTab === tab.id
                    ? 'bg-[#18181B] text-white border-[#18181B]'
                    : 'text-[#71717A] hover:text-[#18181B] hover:bg-white border-transparent hover:border-[#E4E4E7]'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
