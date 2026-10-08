import {
  useEffect,
  useState,
} from 'react';

import {
  AlertTriangle,
  Check,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react';

import {
  Link,
} from 'react-router';

import toast from 'react-hot-toast';

import {
  apiFetch,
} from '../services/api.js';

import {
  useAuth,
} from '../context/AuthContext.jsx';

function formatBytes(bytes) {
  if (!bytes) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  let size = bytes;
  let index = 0;

  while (
    size >= 1024 &&
    index < units.length - 1
  ) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(
    index === 0 ? 0 : 1
  )} ${units[index]}`;
}

export default function DocumentsPage() {
  const { user } = useAuth();

  const isAdmin =
    user?.role === 'ADMIN';

  const [documents, setDocuments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [uploadOpen, setUploadOpen] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [uploadForm, setUploadForm] =
    useState({
      name: '',
      description: '',
      file: null,
    });

  const [uploadError, setUploadError] =
    useState('');

  const [confirmDocument, setConfirmDocument] =
    useState(null);

  const [deactivating, setDeactivating] =
    useState(false);

  const [activating, setActivating] =
    useState(false);

  async function loadDocuments() {
    try {
      const result =
        await apiFetch('/documents');

      setDocuments(
        result.documents || []
      );
    } catch (error) {
      toast.error(
        error.message ||
          'No fue posible cargar los documentos.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocuments =
    documents.filter((document) => {
      const value = search
        .trim()
        .toLowerCase();

      if (!value) {
        return true;
      }

      return [
        document.name,
        document.description,
        document.mimeType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(value);
    });

  const activeDocuments =
    filteredDocuments.filter(
      (document) => document.isActive
    );

  const inactiveDocuments =
    filteredDocuments.filter(
      (document) => !document.isActive
    );

  function openUpload() {
    setUploadForm({
      name: '',
      description: '',
      file: null,
    });

    setUploadError('');
    setUploadOpen(true);
  }

  function closeUpload() {
    if (uploading) {
      return;
    }

    setUploadOpen(false);
    setUploadError('');
  }

  function updateUploadField(
    field,
    value
  ) {
    setUploadForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );

    setUploadError('');
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!uploadForm.name.trim()) {
      setUploadError(
        'El nombre del documento es obligatorio.'
      );
      return;
    }

    if (!uploadForm.file) {
      setUploadError(
        'Selecciona un archivo.'
      );
      return;
    }

    if (
      uploadForm.file.size >
      10 * 1024 * 1024
    ) {
      setUploadError(
        'El archivo no puede superar los 10 MB.'
      );
      return;
    }

    const formData =
      new FormData();

    formData.append(
      'name',
      uploadForm.name.trim()
    );

    formData.append(
      'description',
      uploadForm.description.trim()
    );

    formData.append(
      'file',
      uploadForm.file
    );

    setUploading(true);

    try {
      await apiFetch('/documents', {
        method: 'POST',
        body: formData,
      });

      toast.success(
        'Documento subido correctamente.'
      );

      closeUpload();
      await loadDocuments();
    } catch (error) {
      toast.error(
        error.message ||
          'No fue posible subir el documento.'
      );
    } finally {
      setUploading(false);
    }
  }

  function askDeactivate(document) {
    setConfirmDocument({
      ...document,
      action: 'deactivate',
    });
  }

  function askActivate(document) {
    setConfirmDocument({
      ...document,
      action: 'activate',
    });
  }

  async function confirmDocumentAction() {
    if (!confirmDocument) {
      return;
    }

    const isActivating =
      confirmDocument.action ===
      'activate';

    if (isActivating) {
      setActivating(true);
    } else {
      setDeactivating(true);
    }

    try {
      await apiFetch(
        `/documents/${confirmDocument.id}/${
          isActivating
            ? 'activate'
            : 'deactivate'
        }`,
        {
          method: 'PATCH',
        }
      );

      toast.success(
        isActivating
          ? 'Documento activado correctamente.'
          : 'Documento desactivado correctamente.'
      );

      setConfirmDocument(null);

      await loadDocuments();
    } catch (error) {
      toast.error(
        error.message ||
          'No fue posible actualizar el documento.'
      );
    } finally {
      setActivating(false);
      setDeactivating(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* ENCABEZADO */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#4E8DB5]">
            Archivos
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Documentos
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {activeDocuments.length}{' '}
            documentos activos.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative w-full md:w-80">
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
              placeholder="Buscar documento..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none focus:border-[#5B9BC4] focus:ring-4 focus:ring-[#5B9BC4]/10"
            />
          </div>

          {(user?.role === 'ADMIN' ||
          user?.role === 'EMPLOYEE') && (
          <button
          type="button"
          onClick={openUpload}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B9BC4] px-5 py-3 font-semibold text-slate-950 hover:bg-[#4E8DB5]"
          >
            <Plus size={18} />
            Subir documento
            </button>
          )}
        </div>
      </div>

      {/* DOCUMENTOS ACTIVOS */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">
            Documentos activos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Documentos disponibles actualmente.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Cargando documentos...
          </div>
        ) : activeDocuments.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No se encontraron documentos activos.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeDocuments.map(
              (document) => (
                <div
                  key={document.id}
                  className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#5B9BC4]/15 text-slate-700">
                      <FileText size={22} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">
                        {document.name}
                      </p>

                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {document.description ||
                          'Sin descripción'}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {document.mimeType}
                        {' · '}
                        {formatBytes(
                          document.fileSize
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      to={`/documents/${document.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Ver detalle
                      <ChevronRight size={15} />
                    </Link>

                    {document.canView && (
                      <a
                        href={`${import.meta.env.VITE_API_URL}/documents/${document.id}/view`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Eye size={16} />
                        Ver
                      </a>
                    )}

                    {document.canDownload && (
                      <a
                        href={`${import.meta.env.VITE_API_URL}/documents/${document.id}/download`}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#5B9BC4] px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#4E8DB5]"
                      >
                        <Download size={16} />
                        Descargar
                      </a>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          askDeactivate(
                            document
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        <X size={16} />
                        Desactivar
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* DOCUMENTOS DESACTIVADOS */}
      {isAdmin && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">
              Documentos desactivados
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Estos documentos no están disponibles para los empleados.
            </p>
          </div>

          {inactiveDocuments.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No hay documentos desactivados.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {inactiveDocuments.map(
                (document) => (
                  <div
                    key={document.id}
                    className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <FileText size={22} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-700">
                          {document.name}
                        </p>

                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                          {document.description ||
                            'Sin descripción'}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          {document.mimeType}
                          {' · '}
                          {formatBytes(
                            document.fileSize
                          )}
                        </p>

                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                          <X size={13} />
                          Inactivo
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/documents/${document.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Ver detalle
                        <ChevronRight size={15} />
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          askActivate(
                            document
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
                      >
                        <Check size={16} />
                        Activar
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      )}

      {/* MODAL SUBIR DOCUMENTO */}
      {uploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Subir documento
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Máximo 10 MB. Se validarán el tipo y formato del archivo.
                </p>
              </div>

              <button
                type="button"
                onClick={closeUpload}
                disabled={uploading}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleUpload}
              className="space-y-5 p-6"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nombre del documento
                </label>

                <input
                  value={uploadForm.name}
                  onChange={(event) =>
                    updateUploadField(
                      'name',
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-[#5B9BC4] focus:ring-4 focus:ring-[#5B9BC4]/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Descripción
                </label>

                <textarea
                  value={
                    uploadForm.description
                  }
                  onChange={(event) =>
                    updateUploadField(
                      'description',
                      event.target.value
                    )
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-[#5B9BC4] focus:ring-4 focus:ring-[#5B9BC4]/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Archivo
                </label>

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 px-6 py-8 text-center hover:border-[#5B9BC4]">
                  <Upload
                    size={24}
                    className="text-slate-400"
                  />

                  <span className="mt-2 text-sm font-medium text-slate-700">
                    {uploadForm.file
                      ? uploadForm.file.name
                      : 'Seleccionar archivo'}
                  </span>

                  <span className="mt-1 text-xs text-slate-400">
                    PDF, DOCX, XLSX, PNG, JPG o JPEG
                  </span>

                  <input
                    type="file"
                    accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(event) =>
                      updateUploadField(
                        'file',
                        event.target.files?.[0] ||
                          null
                      )
                    }
                  />
                </label>
              </div>

              {uploadError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {uploadError}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeUpload}
                  disabled={uploading}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#5B9BC4] px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#4E8DB5] disabled:opacity-50"
                >
                  <Upload size={16} />

                  {uploading
                    ? 'Subiendo...'
                    : 'Subir documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ACTIVAR / DESACTIVAR */}
      {confirmDocument && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div
                className={
                  confirmDocument.action ===
                  'activate'
                    ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'
                    : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500'
                }
              >
                {confirmDocument.action ===
                'activate' ? (
                  <Check size={21} />
                ) : (
                  <AlertTriangle
                    size={21}
                  />
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {confirmDocument.action ===
                  'activate'
                    ? 'Activar documento'
                    : 'Desactivar documento'}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {confirmDocument.action ===
                  'activate'
                    ? `¿Quieres volver a activar "${confirmDocument.name}"? El documento volverá a estar disponible para los empleados.`
                    : `¿Quieres desactivar "${confirmDocument.name}"? El documento no se eliminará, pero dejará de estar disponible para los empleados.`}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setConfirmDocument(null)
                }
                disabled={
                  activating ||
                  deactivating
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={
                  confirmDocumentAction
                }
                disabled={
                  activating ||
                  deactivating
                }
                className={
                  confirmDocument.action ===
                  'activate'
                    ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50'
                    : 'inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50'
                }
              >
                {activating ? (
                  'Activando...'
                ) : deactivating ? (
                  'Desactivando...'
                ) : confirmDocument.action ===
                  'activate' ? (
                  <>
                    <Check size={16} />
                    Activar
                  </>
                ) : (
                  <>
                    <X size={16} />
                    Desactivar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}