// Proxies browser requests to TMDB so the API key never reaches the client.
// GET /api/tmdb/<endpoint>?<params>  ->  https://api.themoviedb.org/3/<endpoint>
const TMDB_URL = 'https://api.themoviedb.org/3/'

// Only the endpoints the site actually uses
const ALLOWED = [
  /^movie\/(popular|now_playing)$/,
  /^tv\/(popular|airing_today)$/,
  /^(movie|tv)\/\d+$/,
  /^search\/(movie|tv)$/,
]
const ALLOWED_PARAMS = ['query', 'page', 'language']

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extra },
  })

export default async function handler(request) {
  const url = new URL(request.url)
  const endpoint = url.pathname.replace(/^\/api\/tmdb\//, '')

  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
  if (!ALLOWED.some((re) => re.test(endpoint))) return json({ error: 'Not found' }, 404)

  const key = process.env.TMDB_API_KEY
  if (!key) return json({ error: 'TMDB_API_KEY is not configured' }, 500)

  const target = new URL(TMDB_URL + endpoint)
  target.searchParams.set('language', 'en-US')
  for (const name of ALLOWED_PARAMS) {
    const value = url.searchParams.get(name)
    if (value) target.searchParams.set(name, value)
  }

  // v4 read access tokens are long JWTs; v3 keys are 32-char strings
  const headers = { accept: 'application/json' }
  if (key.length > 40) headers.authorization = `Bearer ${key}`
  else target.searchParams.set('api_key', key)

  try {
    const res = await fetch(target, { headers })
    const data = await res.json()
    return json(data, res.status, res.ok ? { 'cache-control': 'public, max-age=300' } : {})
  } catch {
    return json({ error: 'Failed to reach TMDB' }, 502)
  }
}

export const config = { path: '/api/*' }
