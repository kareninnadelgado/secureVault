import {
  useEffect,
  useState,
} from 'react';

import {
  AlertTriangle,
  ChevronRight,
  FileText,
  Search,
  User,
} from 'lucide-react';

import {
  Link,
} from 'react-router';

import toast from 'react-hot-toast';

import {
  apiFetch,
} from '../services/api.js';

const actions = [
  '',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DEACTIVATED',
  'ROLE_ASSIGNED',
  'DOCUMENT_CREATED',
  'DOCUMENT_VIEW',
  'DOCUMENT_DOWNLOAD',
  'DOCUMENT_ACCESS_UPDATED',
  'DOCUMENT_ACCESS_REVOKED',
  'ACCESS_DENIED',
];

const labels = {
  LOGIN_SUCCESS: 'Inicio de sesión',
  LOGIN_FAILED: 'Inicio fallido',
  LOGOUT: 'Cierre de sesión',
  USER_CREATED: 'Usuario creado',
  USER_UPDATED: 'Usuario actualizado',
  USER_DEACTIVATED: 'Usuario desactivado',
  ROLE_ASSIGNED: 'Rol asignado',
  DOCUMENT_CREATED: 'Documento creado',
  DOCUMENT_VIEW: 'Documento visualizado',
  DOCUMENT_DOWNLOAD: 'Documento descargado',
  DOCUMENT_ACCESS_UPDATED: 'Permiso actualizado',
  DOCUMENT_ACCESS_REVOKED: 'Permiso revocado',
  DOCUMENT_ACTIVATED: 'Documento activado',
  DOCUMENT_DEACTIVATED: 'Documento desactivado',
  ACCESS_DENIED: 'Acceso rechazado',
};

function getIcon(action) {
  if (
    action === 'ACCESS_DENIED' ||
    action === 'LOGIN_FAILED'
  ) {
    return AlertTriangle;
  }

  if (action.startsWith('DOCUMENT')) {
    return FileText;
  }

  return User;
}

export default function AuditPage() {
  const [logs, setLogs] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [action, setAction] =
    useState('');

  useEffect(() => {
    async function loadAudit() {
      setLoading(true);

      try {
        const query = action
          ? `?page=1&limit=50&action=${encodeURIComponent(action)}`
          : '?page=1&limit=50';

        const result =
          await apiFetch(`/audit${query}`);

        setLogs(result.logs || []);
      } catch (error) {
        toast.error(
          error.message ||
            'No fue posible cargar la auditoría'
        );
      } finally {
        setLoading(false);
      }
    }

    loadAudit();
  }, [action]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#4E8DB5]">
            Seguridad
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Auditoría
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Historial de actividad y eventos de seguridad.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Search size={17} className="text-slate-400" />

          <select
            value={action}
            onChange={(event) =>
              setAction(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#5B9BC4]"
          >
            <option value="">
              Todos los eventos
            </option>

            {actions
              .filter(Boolean)
              .map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {labels[item] || item}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Cargando auditoría...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No hay eventos para mostrar.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const Icon = getIcon(
                log.action
              );

              return (
                <Link
                  key={log.id}
                  to={`/audit/${log.id}`}
                  className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 md:flex-row md:items-center"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5B9BC4]/15 text-slate-600">
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">
                      {labels[log.action] ||
                        log.action}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {log.user?.username ||
                        'Sistema'}
                      {' · '}
                      {log.resourceType ||
                        'SYSTEM'}
                      {log.resourceId
                        ? ` #${log.resourceId}`
                        : ''}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {new Intl.DateTimeFormat(
                        'es-MX',
                        {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }
                      ).format(
                        new Date(
                          log.createdAt
                        )
                      )}
                    </p>
                  </div>

                  <ChevronRight
                    size={18}
                    className="shrink-0 text-slate-400"
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}