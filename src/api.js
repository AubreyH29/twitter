// Thin wrapper around fetch for all /api calls.
// Automatically attaches the JWT from localStorage.

const BASE = '/api'

async function request(method, path, body) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong.')
    err.field = data.field || null
    err.status = res.status
    throw err
  }

  return data
}

async function uploadRequest(method, path, formData) {
  const token = localStorage.getItem('token')
  // Do NOT set Content-Type — browser sets it with the multipart boundary
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { method, headers, body: formData })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong.')
    err.field = data.field || null
    err.status = res.status
    throw err
  }

  return data
}

export const api = {
  post: (path, body) => request('POST', path, body),
  get: (path) => request('GET', path),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
  postForm: (path, formData) => uploadRequest('POST', path, formData),
}
