const MESSAGE_SOURCE = 'xingfu-blog-admin-oauth'
const STATE_COOKIE = 'xingfu_github_oauth_state'
const ORIGIN_COOKIE = 'xingfu_github_oauth_origin'
const RETURN_TO_COOKIE = 'xingfu_github_oauth_return_to'
const COOKIE_MAX_AGE = 600

function getAllowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function createNoStoreHeaders(init = {}) {
  const headers = new Headers(init)
  headers.set('Cache-Control', 'no-store')
  return headers
}

function jsonResponse(data, status = 200, init = {}) {
  const headers = createNoStoreHeaders(init.headers)
  headers.set('Content-Type', 'application/json; charset=UTF-8')
  return new Response(JSON.stringify(data, null, 2), { ...init, status, headers })
}

function textResponse(text, status = 200, init = {}) {
  const headers = createNoStoreHeaders(init.headers)
  headers.set('Content-Type', 'text/plain; charset=UTF-8')
  return new Response(text, { ...init, status, headers })
}

function htmlResponse(html, headers = new Headers()) {
  const nextHeaders = createNoStoreHeaders(headers)
  nextHeaders.set('Content-Type', 'text/html; charset=UTF-8')
  return new Response(html, { status: 200, headers: nextHeaders })
}

function parseCookies(request) {
  const header = request.headers.get('Cookie') || ''
  return Object.fromEntries(
    header
      .split(';')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const index = pair.indexOf('=')
        if (index === -1) return [pair, '']
        return [pair.slice(0, index), decodeURIComponent(pair.slice(index + 1))]
      }),
  )
}

function appendCookie(headers, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`Path=${options.path || '/'}`)
  parts.push(`Max-Age=${options.maxAge ?? COOKIE_MAX_AGE}`)
  parts.push(`SameSite=${options.sameSite || 'Lax'}`)
  if (options.httpOnly !== false) parts.push('HttpOnly')
  if (options.secure !== false) parts.push('Secure')
  headers.append('Set-Cookie', parts.join('; '))
}

function clearCookie(headers, name) {
  headers.append('Set-Cookie', `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure`)
}

function createState() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  let binary = ''
  bytes.forEach((value) => {
    binary += String.fromCharCode(value)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function assertEnv(env, key) {
  const value = env[key]
  if (!value) {
    throw new Error(`Missing Cloudflare Worker env: ${key}`)
  }
  return String(value)
}

function buildCallbackUrl(requestUrl) {
  return `${requestUrl.origin}/auth/github/callback`
}

function isAllowedOrigin(origin, allowedOrigins) {
  return allowedOrigins.includes(origin)
}

function sanitizeReturnTo(returnTo, origin) {
  try {
    const url = new URL(returnTo)
    return url.origin === origin ? url.toString() : `${origin}/`
  } catch {
    return `${origin}/`
  }
}

function renderResultPage({ origin, payload, returnTo }) {
  const serializedPayload = JSON.stringify(payload)
  const serializedOrigin = JSON.stringify(origin)
  const serializedReturnTo = JSON.stringify(returnTo)

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GitHub 登录</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f5f5f0;
        color: #111827;
        font: 16px/1.6 "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      main {
        width: min(92vw, 460px);
        padding: 28px 24px;
        border: 1px solid #d6d3d1;
        border-radius: 20px;
        background: #fffef8;
        box-shadow: 0 18px 50px rgba(17, 24, 39, 0.08);
      }
      h1 { margin: 0 0 12px; font-size: 22px; }
      p { margin: 0; color: #57534e; }
    </style>
  </head>
  <body>
    <main>
      <h1>${payload.type === 'success' ? 'GitHub 登录成功' : 'GitHub 登录失败'}</h1>
      <p id="message">${payload.type === 'success' ? '正在返回后台并完成登录。' : payload.error}</p>
    </main>
    <script>
      const payload = ${serializedPayload};
      const targetOrigin = ${serializedOrigin};
      const returnTo = ${serializedReturnTo};

      try {
        if (window.opener && targetOrigin) {
          window.opener.postMessage(payload, targetOrigin);
          window.close();
        }
      } catch (error) {
        console.error(error);
      }

      if (returnTo) {
        window.setTimeout(() => {
          window.location.replace(returnTo);
        }, 1200);
      }
    </script>
  </body>
</html>`
}

async function handleLogin(request, env) {
  const requestUrl = new URL(request.url)
  const origin = requestUrl.searchParams.get('origin') || ''
  const allowedOrigins = getAllowedOrigins(env)

  if (!origin || !isAllowedOrigin(origin, allowedOrigins)) {
    return textResponse('Origin is not allowed.', 400)
  }

  const state = createState()
  const returnTo = sanitizeReturnTo(requestUrl.searchParams.get('return_to') || `${origin}/`, origin)
  const callbackUrl = buildCallbackUrl(requestUrl)
  const githubClientId = assertEnv(env, 'GITHUB_CLIENT_ID')
  const scope = String(env.GITHUB_SCOPE || 'public_repo').trim() || 'public_repo'

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', githubClientId)
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl)
  authorizeUrl.searchParams.set('scope', scope)
  authorizeUrl.searchParams.set('state', state)
  authorizeUrl.searchParams.set('allow_signup', 'false')

  const headers = createNoStoreHeaders()
  headers.set('Location', authorizeUrl.toString())
  appendCookie(headers, STATE_COOKIE, state)
  appendCookie(headers, ORIGIN_COOKIE, origin)
  appendCookie(headers, RETURN_TO_COOKIE, returnTo)

  return new Response(null, { status: 302, headers })
}

async function handleCallback(request, env) {
  const requestUrl = new URL(request.url)
  const cookies = parseCookies(request)
  const state = requestUrl.searchParams.get('state') || ''
  const code = requestUrl.searchParams.get('code') || ''
  const error = requestUrl.searchParams.get('error') || ''
  const origin = cookies[ORIGIN_COOKIE] || ''
  const returnTo = cookies[RETURN_TO_COOKIE] || `${origin || requestUrl.origin}/`
  const headers = new Headers()

  clearCookie(headers, STATE_COOKIE)
  clearCookie(headers, ORIGIN_COOKIE)
  clearCookie(headers, RETURN_TO_COOKIE)

  if (!origin) {
    return htmlResponse(renderResultPage({
      origin: requestUrl.origin,
      returnTo,
      payload: { source: MESSAGE_SOURCE, type: 'error', error: 'OAuth 会话已失效，请重新登录。' },
    }), headers)
  }

  if (error) {
    return htmlResponse(renderResultPage({
      origin,
      returnTo,
      payload: { source: MESSAGE_SOURCE, type: 'error', error: `GitHub 授权失败：${error}` },
    }), headers)
  }

  if (!state || state !== cookies[STATE_COOKIE] || !code) {
    return htmlResponse(renderResultPage({
      origin,
      returnTo,
      payload: { source: MESSAGE_SOURCE, type: 'error', error: 'GitHub 回调校验失败，请重新登录。' },
    }), headers)
  }

  const callbackUrl = buildCallbackUrl(requestUrl)
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: assertEnv(env, 'GITHUB_CLIENT_ID'),
      client_secret: assertEnv(env, 'GITHUB_CLIENT_SECRET'),
      code,
      redirect_uri: callbackUrl,
    }),
  })

  const tokenPayload = await tokenResponse.json()
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    const message = tokenPayload.error_description || tokenPayload.error || 'GitHub token 交换失败。'
    return htmlResponse(renderResultPage({
      origin,
      returnTo,
      payload: { source: MESSAGE_SOURCE, type: 'error', error: message },
    }), headers)
  }

  return htmlResponse(renderResultPage({
    origin,
    returnTo,
    payload: { source: MESSAGE_SOURCE, type: 'success', token: tokenPayload.access_token },
  }), headers)
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)

      if (url.pathname === '/health') {
        return jsonResponse({
          ok: true,
          provider: 'github-oauth',
          allowedOrigins: getAllowedOrigins(env),
        })
      }

      if (url.pathname === '/auth/github/login') {
        return handleLogin(request, env)
      }

      if (url.pathname === '/auth/github/callback') {
        return handleCallback(request, env)
      }

      return textResponse('Not found.', 404)
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500,
      )
    }
  },
}
