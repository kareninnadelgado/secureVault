import { useEffect, useState } from 'react';

import {
  Activity,
  AlertTriangle,
  Download,
  FileText,
  Users,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { apiFetch } from '../services/api.js';

function Card({ title, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#86BEDA]/20">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const result = await apiFetch(
          `/dashboard/summary?period=${period}`
        );

        setData(result);
      } catch (error) {
        toast.error(
          error.message ||
            'No fue posible cargar el dashboard'
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [period]);

  if (loading && !data) {
    return (
      <div className="py-20 text-center text-slate-500">
        Cargando dashboard...
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-[#5d9ab8]">
            Seguridad
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Security Dashboard
          </h1>
        </div>

        <select
          value={period}
          onChange={(event) =>
            setPeriod(event.target.value)
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5"
        >
          <option value="24h">
            Últimas 24 horas
          </option>

          <option value="7d">
            Últimos 7 días
          </option>

          <option value="30d">
            Últimos 30 días
          </option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Usuarios activos"
          value={data.users.active}
          icon={Users}
        />

        <Card
          title="Documentos activos"
          value={data.documents.active}
          icon={FileText}
        />

        <Card
          title="Accesos rechazados"
          value={data.security.accessDenied}
          icon={AlertTriangle}
        />

        <Card
          title="Descargas"
          value={data.security.documentDownloads}
          icon={Download}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Activity size={20} />

          <div>
            <h2 className="font-semibold text-slate-900">
              Actividad de seguridad
            </h2>

            <p className="text-sm text-slate-500">
              Eventos registrados en el periodo.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric
            label="Logins exitosos"
            value={data.security.loginSuccess}
          />

          <Metric
            label="Logins fallidos"
            value={data.security.loginFailed}
          />

          <Metric
            label="Documentos vistos"
            value={data.security.documentViews}
          />

          <Metric
            label="Documentos creados"
            value={data.security.documentCreated}
          />

          <Metric
            label="Usuarios creados"
            value={data.security.userCreated}
          />

          <Metric
            label="Jobs completados"
            value={data.backgroundJobs.completed}
          />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}