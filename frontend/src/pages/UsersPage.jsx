import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Check,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { apiFetch } from '../services/api.js';

const emptyForm = {
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName1: '',
  lastName2: '',
};

function normalizeName(value) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ');
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function splitLastNames(value) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length <= 1) {
    return {
      lastName1: parts.join(' '),
      lastName2: '',
    };
  }

  return {
    lastName1: parts
      .slice(0, -1)
      .join(' '),
    lastName2: parts[parts.length - 1],
  };
}

function roleLabel(role) {
  return role === 'ADMIN'
    ? 'Administrador'
    : 'Empleado';
}

function getUserGroup(user) {
  if (
    user.isActive &&
    user.role === 'ADMIN'
  ) {
    return 0;
  }

  if (
    user.isActive &&
    user.role === 'EMPLOYEE'
  ) {
    return 1;
  }

  return 2;
}

function sortUsers(users) {
  return [...users].sort((a, b) => {
    const groupDifference =
      getUserGroup(a) -
      getUserGroup(b);

    if (groupDifference !== 0) {
      return groupDifference;
    }

    const nameA =
      `${a.firstName || ''} ${a.lastName || ''}`
        .trim()
        .toLowerCase();

    const nameB =
      `${b.firstName || ''} ${b.lastName || ''}`
        .trim()
        .toLowerCase();

    return nameA.localeCompare(nameB);
  });
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function validatePassword(password) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingUser, setEditingUser] =
    useState(null);

  const [form, setForm] =
    useState(emptyForm);

  const [errors, setErrors] =
    useState({});

  const [saving, setSaving] =
    useState(false);

  const [confirmDialog, setConfirmDialog] =
    useState(null);

  const [confirmLoading, setConfirmLoading] =
    useState(false);

  async function loadUsers() {
    try {
      const result = await apiFetch(
        '/users?page=1&limit=50'
      );

      setUsers(result.users || []);
    } catch (error) {
      toast.error(
        error.message ||
          'No fue posible cargar los usuarios.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const orderedUsers = useMemo(
    () => sortUsers(users),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return orderedUsers;
    }

    return orderedUsers.filter((user) =>
      [
        user.firstName,
        user.lastName,
        user.username,
        user.email,
        roleLabel(user.role),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(value)
    );
  }, [orderedUsers, search]);

  const activeUsers = users.filter(
    (user) => user.isActive
  ).length;

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(user) {
  const lastNames = splitLastNames(
    user.lastName || ''
  );

  setEditingUser(user);

  setForm({
    username: user.username || '',
    email: user.email || '',
    password: '',
    firstName: user.firstName || '',
    lastName1: lastNames.lastName1,
    lastName2: lastNames.lastName2,
  });

  setErrors({});
  setModalOpen(true);
}

  function resetModal() {
    setModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
  }

  function hasFormChanges() {
    if (!editingUser) {
      return Object.values(form).some(
        (value) => value.trim() !== ''
      );
    }

    return (
      form.username !==
        (editingUser.username || '') ||
      form.email !==
        (editingUser.email || '') ||
      form.firstName !==
        (editingUser.firstName || '') ||
      `${form.lastName1} ${form.lastName2}`.trim() !== 
      (editingUser.lastName || '') ||
      form.password.trim() !== ''
    );
  }

  function closeModal() {
    if (saving) {
      return;
    }

    if (hasFormChanges()) {
      setConfirmDialog({
        type: 'cancel-form',
        title: '¿Cancelar cambios?',
        message:
          'Tienes información sin guardar. Si sales ahora, se perderán los cambios.',
        confirmText: 'Sí, cancelar',
        cancelText: 'Seguir editando',
      });

      return;
    }

    resetModal();
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = {
        ...current,
      };

      delete next[field];

      return next;
    });
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.username.trim()) {
      nextErrors.username =
        'El usuario es obligatorio.';
    }

    if (!form.email.trim()) {
      nextErrors.email =
        'El correo es obligatorio.';
    } else if (
      !validateEmail(
        form.email.trim()
      )
    ) {
      nextErrors.email =
        'Ingresa un correo válido.';
    }

    if (!editingUser) {
      if (!form.password.trim()) {
        nextErrors.password =
          'La contraseña es obligatoria.';
      } else {
        const passwordRules =
          validatePassword(
            form.password
          );

        if (!passwordRules.length) {
          nextErrors.password =
            'La contraseña debe tener mínimo 8 caracteres.';
        } else if (
          !passwordRules.uppercase
        ) {
          nextErrors.password =
            'La contraseña debe incluir al menos una mayúscula.';
        } else if (
          !passwordRules.lowercase
        ) {
          nextErrors.password =
            'La contraseña debe incluir al menos una minúscula.';
        } else if (!passwordRules.number) {
          nextErrors.password =
            'La contraseña debe incluir al menos un número.';
        } else if (
          !passwordRules.special
        ) {
          nextErrors.password =
            'La contraseña debe incluir al menos un carácter especial.';
        }
      }
    }

    if (!form.firstName.trim()) {
      nextErrors.firstName =
        'El nombre es obligatorio.';
    }

    if (!form.lastName1.trim()) {
  nextErrors.lastName1 =
    'El apellido paterno es obligatorio.';
}

if (!form.lastName2.trim()) {
  nextErrors.lastName2 =
    'El apellido materno es obligatorio.';
}

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
      toast.error(
        'Revisa los campos marcados en rojo.'
      );

      return;
    }

    setSaving(true);

    try {
      if (editingUser) {
        await apiFetch(
          `/users/${editingUser.id}`,
          {
            method: 'PATCH',
            body: {
              username: normalizeName(
                form.username
              ),
              email: normalizeEmail(
                form.email
              ),
              firstName: normalizeName(
                form.firstName
              ),
              lastName: normalizeName(
                `${form.lastName1} ${form.lastName2}`
            ),
            },
          }
        );

        toast.success(
          'Usuario actualizado correctamente.'
        );
      } else {
        await apiFetch('/users', {
          method: 'POST',
          body: {
            username: normalizeName(
              form.username
            ),
            email: normalizeEmail(
              form.email
            ),
            password: form.password,
            firstName: normalizeName(
              form.firstName
            ),
            lastName: normalizeName(
                `${form.lastName1} ${form.lastName2}`
            ),
          },
        });

        toast.success(
          'Usuario creado correctamente.'
        );
      }

      resetModal();
      await loadUsers();
    } catch (error) {
      toast.error(
        error.message ||
          'No fue posible guardar el usuario.'
      );
    } finally {
      setSaving(false);
    }
  }

  function askChangeRole(user) {
    const newRole =
      user.role === 'ADMIN'
        ? 'EMPLOYEE'
        : 'ADMIN';

    setConfirmDialog({
      type: 'role',
      user,
      newRole,
      title: 'Cambiar rol',
      message: `¿Quieres cambiar el rol de ${user.username} a ${roleLabel(
        newRole
      )}?`,
      confirmText: 'Cambiar rol',
      cancelText: 'Cancelar',
    });
  }

  function askDeactivate(user) {
    setConfirmDialog({
      type: 'deactivate',
      user,
      title: 'Desactivar usuario',
      message: `¿Quieres desactivar a ${user.username}? Esta cuenta ya no podrá iniciar sesión.`,
      confirmText: 'Desactivar',
      cancelText: 'Cancelar',
    });
  }

  function askActivate(user) {
  setConfirmDialog({
    type: 'activate',
    user,
    title: 'Activar usuario',
    message: `¿Quieres volver a activar a ${user.username}? Esta cuenta podrá iniciar sesión nuevamente.`,
    confirmText: 'Activar',
    cancelText: 'Cancelar',
  });
}

  async function confirmAction() {
    if (!confirmDialog) {
      return;
    }

    if (
      confirmDialog.type ===
      'cancel-form'
    ) {
      setConfirmDialog(null);
      resetModal();
      return;
    }

    setConfirmLoading(true);

    try {
      if (
        confirmDialog.type === 'role'
      ) {
        await apiFetch(
          `/users/${confirmDialog.user.id}/role`,
          {
            method: 'PATCH',
            body: {
              role: confirmDialog.newRole,
            },
          }
        );

        toast.success(
          'Rol actualizado correctamente.'
        );
      }

      if (
        confirmDialog.type ===
        'deactivate'
      ) {
        await apiFetch(
          `/users/${confirmDialog.user.id}/deactivate`,
          {
            method: 'PATCH',
          }
        );

        toast.success(
          'Usuario desactivado correctamente.'
        );
      }

      if (
  confirmDialog.type === 'activate'
) {
  await apiFetch(
    `/users/${confirmDialog.user.id}/activate`,
    {
      method: 'PATCH',
    }
  );

  toast.success(
    'Usuario activado correctamente.'
  );
}

      setConfirmDialog(null);
      await loadUsers();
    } catch (error) {
      toast.error(
        error.message ||
          'No fue posible completar la acción.'
      );
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#4E8DB5]">
            Administración
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Usuarios
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {users.length} usuarios ·{' '}
            {activeUsers} activos
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar usuario..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none focus:border-[#5B9BC4] sm:w-64"
            />
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B9BC4] px-5 py-3 font-semibold text-slate-950 hover:bg-[#4E8DB5]"
          >
            <Plus size={18} />
            Nuevo usuario
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Cargando usuarios...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                    Usuario
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                    Correo
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                    Rol
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                    Estado
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(
                  (user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50 ${
                        !user.isActive
                          ? 'bg-slate-50/70'
                          : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <p
                          className={`font-semibold ${
                            user.isActive
                              ? 'text-slate-800'
                              : 'text-slate-500'
                          }`}
                        >
                          {user.firstName}{' '}
                          {user.lastName}
                        </p>

                        <p className="text-xs text-slate-500">
                          @{user.username}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.email}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            askChangeRole(user)
                          }
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#5B9BC4]/15 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-[#5B9BC4]/25"
                          title="Cambiar rol"
                        >
                          <ShieldCheck size={13} />
                          {roleLabel(user.role)}
                        </button>
                      </td>

                      <td className="px-6 py-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <UserCheck size={13} />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                            <UserX size={13} />
                            Inactivo
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(user)
                            }
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            title="Editar"
                          >
                            <Pencil size={17} />
                          </button>

                          {user.isActive ? (
  <button
    type="button"
    onClick={() =>
      askDeactivate(user)
    }
    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
    title="Desactivar"
  >
    <UserX size={17} />
  </button>
) : (
  <button
    type="button"
    onClick={() =>
      askActivate(user)
    }
    className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
    title="Activar"
  >
    <UserCheck size={17} />
  </button>
)}
                        </div>
                      </td>
                    </tr>
                  )
                )}

                {!filteredUsers.length && (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-12 text-center text-sm text-slate-500"
                    >
                      No se encontraron usuarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingUser
                    ? 'Editar usuario'
                    : 'Nuevo usuario'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingUser
                    ? 'Actualiza la información de la cuenta.'
                    : 'Completa los datos para crear la cuenta.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-6"
              noValidate
            >
              <Input
                label="Usuario"
                value={form.username}
                error={errors.username}
                onChange={(value) =>
                  updateField(
                    'username',
                    value
                  )
                }
              />

              <Input
                label="Correo"
                type="email"
                value={form.email}
                error={errors.email}
                onChange={(value) =>
                  updateField(
                    'email',
                    value
                  )
                }
              />

              {!editingUser && (
                <div>
                  <Input
                    label="Contraseña"
                    type="password"
                    value={form.password}
                    error={errors.password}
                    onChange={(value) =>
                      updateField(
                        'password',
                        value
                      )
                    }
                  />

                  <div className="mt-2 space-y-1 text-xs">
                    <PasswordRule
                      valid={
                        form.password
                          .length >= 8
                      }
                      text="Mínimo 8 caracteres"
                    />

                    <PasswordRule
                      valid={/[A-Z]/.test(
                        form.password
                      )}
                      text="Una letra mayúscula"
                    />

                    <PasswordRule
                      valid={/[a-z]/.test(
                        form.password
                      )}
                      text="Una letra minúscula"
                    />

                    <PasswordRule
                      valid={/\d/.test(
                        form.password
                      )}
                      text="Un número"
                    />

                    <PasswordRule
                      valid={/[^A-Za-z0-9]/.test(
                        form.password
                      )}
                      text="Un carácter especial"
                    />
                  </div>
                </div>
              )}

              <Input
  label="Nombre"
  value={form.firstName}
  error={errors.firstName}
  onChange={(value) =>
    updateField(
      'firstName',
      value
    )
  }
/>

<div className="grid gap-4 sm:grid-cols-2">
  <Input
    label="Apellido paterno"
    value={form.lastName1}
    error={errors.lastName1}
    onChange={(value) =>
      updateField(
        'lastName1',
        value
      )
    }
  />

  <Input
    label="Apellido materno"
    value={form.lastName2}
    error={errors.lastName2}
    onChange={(value) =>
      updateField(
        'lastName2',
        value
      )
    }
  />
</div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#5B9BC4] px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#4E8DB5] disabled:opacity-50"
                >
                  {saving
                    ? 'Guardando...'
                    : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmModal
          dialog={confirmDialog}
          loading={confirmLoading}
          onCancel={() =>
            setConfirmDialog(null)
          }
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
}

function PasswordRule({
  valid,
  text,
}) {
  return (
    <p
      className={
        valid
          ? 'text-emerald-600'
          : 'text-slate-400'
      }
    >
      {valid ? '✓' : '○'} {text}
    </p>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  error,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        aria-invalid={Boolean(error)}
        className={`w-full rounded-xl border px-4 py-2.5 outline-none transition ${
          error
            ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
            : 'border-slate-200 focus:border-[#5B9BC4] focus:ring-4 focus:ring-[#5B9BC4]/10'
        }`}
      />

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function ConfirmModal({
  dialog,
  loading,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5B9BC4]/15 text-[#4E8DB5]">
            <Check size={21} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {dialog.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {dialog.message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {dialog.cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-[#5B9BC4] px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#4E8DB5] disabled:opacity-50"
          >
            {loading
              ? 'Procesando...'
              : dialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}