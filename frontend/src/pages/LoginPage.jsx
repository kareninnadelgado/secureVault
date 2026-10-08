import { useState } from 'react';
import {
  Navigate,
  useNavigate,
} from 'react-router';

import {
  ShieldCheck,
  Eye,
  EyeOff,
  LockKeyhole,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const {
    user,
    login,
  } = useAuth();

  const navigate = useNavigate();

  const [username, setUsername] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  if (user) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!username.trim() || !password) {
      toast.error(
        'Ingresa usuario y contraseña'
      );

      return;
    }

    setLoading(true);

    try {
      await login({
        username: username.trim(),
        password,
      });

      toast.success(
        'Bienvenido a SecureVault'
      );

      navigate('/dashboard', {
        replace: true,
      });
    } catch (error) {
      toast.error(
        error.message ||
          'No fue posible iniciar sesión'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f5f8fa]">
      <div className="hidden flex-1 items-center justify-center bg-[#86BEDA]/20 lg:flex">
        <div className="max-w-xl px-12">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
            <ShieldCheck
              size={34}
              className="text-slate-800"
            />
          </div>

          <h1 className="text-5xl font-bold leading-tight text-slate-900">
            Secure document
            <br />
            management.
          </h1>

          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
            Administra documentos, permisos y
            actividad de seguridad desde un solo
            lugar.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-[520px] lg:bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-2xl font-bold text-slate-900">
              SecureVault
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Inicia sesión para continuar
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Usuario
              </label>

              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#86BEDA] focus:ring-4 focus:ring-[#86BEDA]/15"
                placeholder="Tu usuario"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Contraseña
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 outline-none focus:border-[#86BEDA] focus:ring-4 focus:ring-[#86BEDA]/15"
                  placeholder="Tu contraseña"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#86BEDA] px-4 py-3 font-semibold text-slate-900 hover:bg-[#75b4d4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Iniciando sesión...'
                : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}