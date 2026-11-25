// In-memory auth token store (never stored in localStorage/sessionStorage)
let memoryAuthToken: string | null = null;

export function setMemoryAuthToken(token: string | null) {
  memoryAuthToken = token;
}

export function getMemoryAuthToken(): string | null {
  return memoryAuthToken;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (memoryAuthToken) {
    headers.set('Authorization', `Bearer ${memoryAuthToken}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => null);
      if (data?.error) errorMessage = data.error;
    } else {
      const txt = await res.text().catch(() => '');
      if (txt) errorMessage = txt;
    }
    throw new Error(errorMessage);
  }

  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export async function uploadDocumentFile(
  file: File,
  category: string
): Promise<{ id: number; fileName: string; mimeType: string; sizeBytes: number; category: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  const res = await apiFetch<{
    document: { id: number; fileName: string; mimeType: string; sizeBytes: number; category: string };
  }>('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });
  return res.document;
}

export async function downloadAuthorizedFile(url: string, fallbackName: string) {
  const headers = new Headers();
  if (memoryAuthToken) {
    headers.set('Authorization', `Bearer ${memoryAuthToken}`);
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Download failed.' }));
    throw new Error(err.error || 'Download failed.');
  }
  const blob = await res.blob();
  const disp = res.headers.get('content-disposition') || '';
  const match = disp.match(/filename="([^"]+)"/);
  const filename = match?.[1] || fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
