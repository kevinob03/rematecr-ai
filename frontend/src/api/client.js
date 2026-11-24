export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let response
  try {
    response = await fetch('/api/v1' + path, {
      method,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('No pudimos conectar con el servicio. Revisá la conexión e intentá de nuevo.', 0)
  }
  if (response.status === 204) return undefined
  const content = await response.json().catch(() => null)
  if (!response.ok || !content) {
    const fallback = response.ok ? 'El servicio devolvió una respuesta inesperada.' : 'No pudimos completar la solicitud.'
    throw new ApiError(content?.error?.message || fallback, response.status, content?.error?.code)
  }
  return content
}

export async function uploadPdf(path, file) {
  const response = await fetch('/api/v1' + path, {
    method:'POST', credentials:'same-origin', headers:{
      Accept:'application/json','Content-Type':'application/pdf',
      'X-Document-Name':encodeURIComponent(file.name),
    },body:file,
  }).catch(() => { throw new ApiError('No pudimos conectar con el servicio.',0) })
  const content=await response.json().catch(()=>null)
  if(!response.ok) throw new ApiError(content?.error?.message||'No pudimos procesar el PDF.',response.status,content?.error?.code)
  return content
}
