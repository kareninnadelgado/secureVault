import { Link } from 'react-router';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] px-6">
      <div className="text-center">
        <p className="text-sm font-semibold text-red-500">
          403
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Acceso no autorizado
        </h1>

        <p className="mt-3 text-slate-500">
          Tu cuenta no tiene permisos para esta sección.
        </p>

        <Link
          to="/documents"
          className="mt-6 inline-flex rounded-xl bg-[#86BEDA] px-5 py-3 font-semibold"
        >
          Ir a documentos
        </Link>
      </div>
    </div>
  );
}