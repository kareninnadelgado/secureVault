import {
  useEffect,
  useState,
} from 'react';

import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import {
  Link,
  useParams,
} from 'react-router';

import toast from 'react-hot-toast';

import { apiFetch } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function PermissionBadge({ allowed }) {
  return allowed ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <Check size={13} />
      Sí
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
      <X size={13} />
      No
    </span>
  );
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const isAdmin =
    user?.role === 'ADMIN';

  const [document, setDocument] =
    useState(null);

  const [permissions, setPermissions] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [permissionModalOpen, setPermissionModalOpen] =
    useState(false);

  const [editingPermission, setEditingPermission] =
    useState(null);

  const [selectedUserId, setSelectedUserId] =
    useState('');

  const [canView, setCanView] =
    useState(true);

  const [canDownload, setCanDownload] =
    useState(false);

  const [permissionError, setPermissionError] =
    useState('');

  const [savingPermission, setSavingPermission] =
    useState(false);

  const [confirmDialog, setConfirmDialog] =
    useState(null);

  const [confirmLoading, setConfirmLoading] =
    useState(false);

  async function loadPermissions() {
    if (!isAdmin) {
      return;
    }

    const result = await apiFetch(
      `/documents/${id}/permissions`
    );

    setPermissions(
      result.permissions || []
    );
  }

  async function loadUsers() {
    if (!isAdmin) {
      return;
    }

    const result = await apiFetch(
      '/users?page=1&limit=50'
    );

    setUsers(
      (result.users || []).filter(
        (item) => item.isActive
      )
    );
  }

  async function loadDocument() {
    try {
      const result =
        await apiFetch(
          `/documents/${id}`
        );

      setDocument(result);

      if (isAdmin) {
        try {
          await Promise.all([
            loadPermissions(),
            loadUsers(),
          ]);
        } catch (error) {
          toast.error(
            error.message ||
              'No fue posible cargar los permisos.'
          );
        }
      }
    } catch (error) {
      toast.error(
        error.message ||
          'No fue posible cargar el documento.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocument();
  }, [id, isAdmin]);

  function openAddPermission() {
    setEditingPermission(null);
    setSelectedUserId('');
    setCanView(true);
    setCanDownload(false);
    setPermissionError('');
    setPermissionModalOpen(true);
  }

  function openEditPermission(permission) {
    setEditingPermission(permission);
    setSelectedUserId(
      String(permission.userId)
    );
    setCanView(
      Boolean(permission.canView)
    );
    setCanDownload(
      Boolean(permission.canDownload)
    );
    setPermissionError('');
    setPermissionModalOpen(true);
  }

  function closePermissionModal() {
    if (savingPermission) {
      return;
    }

    setPermissionModalOpen(false);
    setEditingPermission(null);
    setSelectedUserId('');
    setCanView(true);
    setCanDownload(false);
    setPermissionError('');
  }

  function handleViewChange(value) {
    setCanView(value);

    if (!value) {
      setCanDownload(false);
    }
  }

  async function savePermission(
    event
  ) {
    event.preventDefault();

    if (!selectedUserId) {
      setPermissionError(
        'Selecciona un usuario.'
      );
      return;
    }

    if (
      canDownload &&
      !canView
    ) {
      setPermissionError(
        'Un usuario debe poder ver el documento antes de poder descargarlo.'
      );
      return;
    }

    setPermissionError('');
    setSavingPermission(true);

    try {
      await apiFetch(
        `/documents/${id}/permissions/${selectedUserId}`,
        {
          method: 'PUT',
          body: {
            canView,
            canDownload,
          },
        }
      );

      toast.success(
        editingPermission
          ? 'Permisos actualizados correctamente.'
          : 'Permisos otorgados correctamente.'
      );

      closePermissionModal();
      await loadPermissions();
    } catch (error) {
      toast.error(
        error.message ||
          'No fue posible guardar los permisos.'
      );
    } finally {
      setSavingPermission(false);
    }
  }

  function askRevokePermission(
    permission
  ) {
    const name =
      `${permission.user?.firstName || ''} ${permission.user?.lastName || ''}`.trim();

    setConfirmDialog({
      permission,
      title: 'Revocar acceso',
      message: `¿Quieres quitar el acceso de ${name || permission.user?.username || 'este usuario'} a este documento?`,
    });
  }

  async function confirmRevoke() {
    if (!confirmDialog?.permission) {
      return;
    }

    setConfirmLoading(true);

    try {
      await apiFetch(
        `/documents/${id}/permissions/${confirmDialog.permission.userId}`,
        {
          method: 'DELETE',
        }
      );

      toast.success(
        'Acceso revocado correctamente.'
      );

      setConfirmDialog(null);
      await loadPermissions();
    } catch (error) {
      toast.error(
        error.message ||
          'No fue posible revocar el acceso.'
      );
    } finally {
      setConfirmLoading(false);
    }
  }

  const availableUsers = users.filter(
    (item) => {
      const alreadyAssigned =
        permissions.some(
          (permission) =>
            String(
              permission.userId
            ) === String(item.id)
        );

      if (
        editingPermission &&
        String(item.id) ===
          String(editingPermission.userId)
      ) {
        return true;
      }

      return !alreadyAssigned;
    }
  );

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        Cargando documento...
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <div className="space-y-8">
      <Link
        to="/documents"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Volver a documentos
      </Link>

      <div>
        <p className="text-sm font-medium text-[#4E8DB5]">
          Documento #{document.id}
        </p>

        <h1 className="mt-1 break-words text-3xl font-bold text-slate-900">
          {document.name}
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          {document.description ||
            'Sin descripción'}
        </p>
      </div>

      <section
        className={
          isAdmin
            ? 'grid gap-6 lg:grid-cols-2'
            : 'grid gap-6'
        }
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5B9BC4]/15">
              <FileText size={21} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Información
              </h2>

              <p className="text-sm text-slate-500">
                Datos del documento
              </p>
            </div>
          </div>

          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                Tipo
              </dt>

              <dd className="font-medium text-slate-800">
                {document.mimeType}
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                Tamaño
              </dt>

              <dd className="font-medium text-slate-800">
                {document.fileSize}{' '}
                bytes
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                Subido por
              </dt>

              <dd className="font-medium text-slate-800">
                {document.uploader
                  ? `${document.uploader.firstName} ${document.uploader.lastName}`
                  : '—'}
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                Estado
              </dt>

              <dd className="font-medium text-emerald-700">
                {document.isActive
                  ? 'Activo'
                  : 'Inactivo'}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`${import.meta.env.VITE_API_URL}/documents/${document.id}/view`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
            >
              <Eye size={16} />
              Ver
            </a>

            {document.canDownload && (
                <a
                href={`${import.meta.env.VITE_API_URL}/documents/${document.id}/download`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#5B9BC4] px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#4E8DB5]"
                >
                    <Download size={16} />
                    Descargar
                    </a>
                )}
          </div>
        </div>

        {isAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Permisos de acceso
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Administra quién puede ver o descargar este documento.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddPermission}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#5B9BC4] px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#4E8DB5]"
              >
                <Plus size={16} />
                Agregar
              </button>
            </div>

            {permissions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No hay usuarios con permisos.
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Agrega un usuario para permitirle acceder a este documento.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {permissions.map(
                  (permission) => (
                    <div
                      key={`${permission.documentId}-${permission.userId}`}
                      className="p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {permission.user?.firstName}{' '}
                            {permission.user?.lastName}
                          </p>

                          <p className="text-xs text-slate-500">
                            @{permission.user?.username}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <p className="mb-1 text-[11px] text-slate-400">
                              Ver
                            </p>

                            <PermissionBadge
                              allowed={
                                permission.canView
                              }
                            />
                          </div>

                          <div>
                            <p className="mb-1 text-[11px] text-slate-400">
                              Descargar
                            </p>

                            <PermissionBadge
                              allowed={
                                permission.canDownload
                              }
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              openEditPermission(
                                permission
                              )
                            }
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            title="Editar permisos"
                          >
                            <Pencil
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              askRevokePermission(
                                permission
                              )
                            }
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            title="Revocar acceso"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {permissionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingPermission
                    ? 'Editar permisos'
                    : 'Agregar acceso'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Define qué puede hacer el usuario con este documento.
                </p>
              </div>

              <button
                type="button"
                onClick={closePermissionModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={savePermission}
              className="space-y-5 p-6"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Usuario
                </label>

                <select
                  value={selectedUserId}
                  onChange={(event) =>
                    setSelectedUserId(
                      event.target.value
                    )
                  }
                  disabled={
                    Boolean(
                      editingPermission
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-[#5B9BC4] focus:ring-4 focus:ring-[#5B9BC4]/10 disabled:bg-slate-50"
                >
                  <option value="">
                    Seleccionar usuario
                  </option>

                  {availableUsers.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.firstName}{' '}
                        {item.lastName} — @
                        {item.username}
                      </option>
                    )
                  )}
                </select>

                {permissionError && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    {permissionError}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                  <input
                    type="checkbox"
                    checked={canView}
                    onChange={(event) =>
                      handleViewChange(
                        event.target.checked
                      )
                    }
                    className="mt-0.5 h-4 w-4 accent-[#5B9BC4]"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      Puede ver
                    </span>

                    <span className="block text-xs text-slate-500">
                      Permite consultar el contenido del documento.
                    </span>
                  </span>
                </label>

                <label
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    !canView
                      ? 'border-slate-100 bg-slate-50'
                      : 'border-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={canDownload}
                    disabled={!canView}
                    onChange={(event) =>
                      setCanDownload(
                        event.target.checked
                      )
                    }
                    className="mt-0.5 h-4 w-4 accent-[#5B9BC4] disabled:opacity-40"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      Puede descargar
                    </span>

                    <span className="block text-xs text-slate-500">
                      Permite guardar una copia del archivo.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePermissionModal}
                  disabled={savingPermission}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingPermission}
                  className="rounded-xl bg-[#5B9BC4] px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#4E8DB5] disabled:opacity-50"
                >
                  {savingPermission
                    ? 'Guardando...'
                    : 'Guardar permisos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Trash2 size={20} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {confirmDialog.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog(null)
                }
                disabled={confirmLoading}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmRevoke}
                disabled={confirmLoading}
                className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {confirmLoading
                  ? 'Revocando...'
                  : 'Revocar acceso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}