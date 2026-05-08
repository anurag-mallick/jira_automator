export async function uploadAttachment(ticketId: number, file: File): Promise<{ path: string; name: string; size: number; type: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('ticketId', ticketId.toString());

  const res = await fetch('/api/assets/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }

  return res.json();
}

export async function getFileUrl(path: string): Promise<string> {
  return `/api/assets/file?path=${encodeURIComponent(path)}`;
}
