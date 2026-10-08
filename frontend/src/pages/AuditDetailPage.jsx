import {
  useEffect,
  useState,
} from 'react';

import {
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

import {
  Link,
  useParams,
} from 'react-router';

import toast from 'react-hot-toast';

import {
  apiFetch,
} from '../services/api.js';

export default function AuditDetailPage() {
  const { id } = useParams();

  const [log, setLog] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadLog() {
      try {
        const result =
          await apiFetch(`/audit/${id}`);

        setLog(result);
      } catch (error) {
        toast.error(
          error.message ||
            'No fue posible cargar el evento'
        );
      } finally {
        setLoading(false);
      }
    }

    loadLog();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        Cargando evento...
      </div>
    );
  }

  if (!log) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link
        to="/audit"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Volver a auditoría
      </Link>

      <div>
        <p className="text-sm font-medium text-[#4E8DB5]">
          Evento #{log.id}
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          {log.action}
        </h1>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5B9BC4]/15">
            <ShieldCheck size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Información del evento
            </h2>

            <p className="text-sm text-slate-500">
              Registro almacenado en SecureVault.
            </p>
          </div>
        </div>

        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-slate-500">
              Usuario
            </dt>

            <dd className="font-medium text-slate-800">
              {log.user?.username ||
                'Sistema'}
            </dd>
          </div>

          <div className="flex justify-between gap-6">
            <dt className="text-slate-500">
              Recurso
            </dt>

            <dd className="font-medium text-slate-800">
              {log.resourceType ||
                'SYSTEM'}
              {log.resourceId
                ? ` #${log.resourceId}`
                : ''}
            </dd>
          </div>

          <div className="flex justify-between gap-6">
            <dt className="text-slate-500">
              IP
            </dt>

            <dd className="font-medium text-slate-800">
              {log.ipAddress || '—'}
            </dd>
          </div>

          <div className="flex justify-between gap-6">
            <dt className="text-slate-500">
              Fecha
            </dt>

            <dd className="font-medium text-slate-800">
              {new Intl.DateTimeFormat(
                'es-MX',
                {
                  dateStyle: 'long',
                  timeStyle: 'medium',
                }
              ).format(
                new Date(log.createdAt)
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Metadata
          </h3>

          <pre className="overflow-x-auto rounded-xl bg-slate-950 p-5 text-xs leading-6 text-slate-200">
            {JSON.stringify(
              log.metadata,
              null,
              2
            )}
          </pre>
        </div>
      </section>
    </div>
  );
}