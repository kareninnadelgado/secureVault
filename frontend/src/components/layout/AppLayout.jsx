import {
  useState,
} from 'react';

import {
  NavLink,
  Outlet,
  useNavigate,
} from 'react-router';

import {
  LayoutDashboard,
  Users,
  FileText,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext.jsx';

const navigation = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN'],
  },
  {
    label: 'Usuarios',
    path: '/users',
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    label: 'Documentos',
    path: '/documents',
    icon: FileText,
    roles: ['ADMIN', 'EMPLOYEE'],
  },
  {
    label: 'Auditoría',
    path: '/audit',
    icon: ShieldCheck,
    roles: ['ADMIN'],
  },
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const {
    user,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  const visibleNavigation =
    navigation.filter((item) =>
      item.roles.includes(user?.role)
    );

  async function handleLogout() {
    try {
      await logout();

      toast.success(
        'Sesión cerrada correctamente'
      );

      setMobileOpen(false);

      navigate('/login', {
        replace: true,
      });
    } catch (error) {
      toast.error(
        error.message ||
          'No fue posible cerrar la sesión'
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f8fa]">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-[280px]',
          'flex-col border-r border-slate-200 bg-white',
          'transition-transform duration-200',
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 px-6">
          <div>
            <p className="text-xl font-bold text-slate-900">
              SecureVault
            </p>

            <p className="text-xs text-slate-500">
              Gestor seguro de documentos
            </p>
          </div>

          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={21} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1.5">
            {visibleNavigation.map(
              ({
                label,
                path,
                icon: Icon,
              }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-4 py-3',
                      'text-sm font-medium transition',
                      isActive
                        ? 'bg-[#5B9BC4]/20 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-100',
                    ].join(' ')
                  }
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </NavLink>
              )
            )}
          </div>
        </nav>

        <div className="shrink-0 border-t border-slate-200 p-4">
          <div className="mb-3 rounded-xl bg-slate-50 p-3">
            <p className="truncate font-semibold text-slate-800">
              {user?.firstName}{' '}
              {user?.lastName}
            </p>

            <p className="mt-0.5 truncate text-xs text-slate-500">
              @{user?.username}
            </p>

            <span className="mt-2 inline-flex rounded-full bg-[#5B9BC4]/20 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              {user?.role}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu size={22} />
          </button>

          <div className="hidden lg:block">
            <p className="text-sm font-medium text-slate-700">
              Panel de administración
            </p>

            <p className="text-xs text-slate-400">
              Sistema de gestión segura
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="hidden sm:block">
              {user?.firstName}
            </span>

            <ChevronRight size={16} />
          </div>
        </header>

        <main className="min-h-[calc(100vh-5rem)] p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}