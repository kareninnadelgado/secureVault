const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000/api';

let csrfToken = null;
let refreshPromise = null;

const MUTATING_METHODS = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

function isMutating(method = 'GET') {
  return MUTATING_METHODS.has(
    method.toUpperCase()
  );
}

function readCookie(name) {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const [cookieName, ...valueParts] =
      cookie.trim().split('=');

    if (cookieName === name) {
      return valueParts.join('=') || null;
    }
  }

  return null;
}

csrfToken = readCookie('csrf_token');

async function parseResponse(response) {
  const contentType =
    response.headers.get('content-type') || '';

  if (
    contentType.includes('application/json')
  ) {
    return response.json();
  }

  return null;
}

async function createApiError(response) {
  const data = await parseResponse(response);

  const error = new Error(
    data?.error ||
      `Request failed with status ${response.status}`
  );

  error.status = response.status;
  error.details = data?.details;

  return error;
}

async function loadCsrfToken() {
  const cookieToken =
    readCookie('csrf_token');

  if (cookieToken) {
    csrfToken = cookieToken;
    return csrfToken;
  }

  const response = await fetch(
    `${API_URL}/auth/csrf`,
    {
      method: 'GET',
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw await createApiError(response);
  }

  const data = await response.json();

  csrfToken = data.csrfToken;

  return csrfToken;
}

async function refreshSession() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    if (!csrfToken) {
      csrfToken = readCookie('csrf_token');
    }

    if (!csrfToken) {
      await loadCsrfToken();
    }

    const response = await fetch(
      `${API_URL}/auth/refresh`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      }
    );

    if (!response.ok) {
      csrfToken = null;
      throw await createApiError(response);
    }

    csrfToken = readCookie('csrf_token');

    if (!csrfToken) {
      await loadCsrfToken();
    }

    return true;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function apiFetch(
  path,
  {
    method = 'GET',
    body,
    headers = {},
    retry = true,
  } = {}
) {
  const normalizedMethod =
    method.toUpperCase();

  const requestHeaders = new Headers(
    headers
  );

  const isFormData =
    body instanceof FormData;

  if (
    body &&
    !isFormData &&
    !requestHeaders.has('Content-Type')
  ) {
    requestHeaders.set(
      'Content-Type',
      'application/json'
    );
  }

  if (
    isMutating(normalizedMethod) &&
    !csrfToken &&
    path !== '/auth/login'
  ) {
    try {
      await loadCsrfToken();
    } catch {
      // The real request will expose the actual error.
    }
  }

  if (
    isMutating(normalizedMethod) &&
    csrfToken &&
    path !== '/auth/login'
  ) {
    requestHeaders.set(
      'X-CSRF-Token',
      csrfToken
    );
  }

  const finalBody =
    body &&
    !isFormData &&
    typeof body !== 'string'
      ? JSON.stringify(body)
      : body;

  const response = await fetch(
    `${API_URL}${path}`,
    {
      method: normalizedMethod,
      credentials: 'include',
      headers: requestHeaders,
      body: finalBody,
    }
  );

  if (
    response.status === 401 &&
    retry &&
    path !== '/auth/login' &&
    path !== '/auth/refresh' &&
    path !== '/auth/logout'
  ) {
    try {
      await refreshSession();

      return apiFetch(path, {
        method,
        body,
        headers,
        retry: false,
      });
    } catch {
      csrfToken = null;
    }
  }

  if (!response.ok) {
    throw await createApiError(response);
  }

  return parseResponse(response);
}

export async function loginUser(
  credentials
) {
  const data = await apiFetch(
    '/auth/login',
    {
      method: 'POST',
      body: credentials,
    }
  );

  csrfToken =
    readCookie('csrf_token');

  if (!csrfToken) {
    await loadCsrfToken();
  }

  return data;
}

export async function logoutUser() {
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
    });
  } finally {
    csrfToken = null;
  }
}

export async function getCurrentUser() {
  const data =
    await apiFetch('/auth/me');

  return data?.user ?? data;
}

export function getApiFileUrl(path) {
  return `${API_URL}${path}`;
}