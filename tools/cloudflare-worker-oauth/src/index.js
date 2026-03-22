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

function setCorsHeaders(headers, origin) {
  if (!origin) return headers
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Vary', 'Origin')
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

function getValidatedRequestOrigin(request, env, fallbackOrigin = '') {
  const allowedOrigins = getAllowedOrigins(env)
  const requestOrigin = request.headers.get('Origin') || fallbackOrigin
  if (!requestOrigin || !isAllowedOrigin(requestOrigin, allowedOrigins)) {
    return ''
  }
  return requestOrigin
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
    <title>GitHub Login</title>
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
      <p id="message">${payload.type === 'success' ? '正在返回后台页面。' : payload.error}</p>
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
    return htmlResponse(
      renderResultPage({
        origin: requestUrl.origin,
        returnTo,
        payload: { source: MESSAGE_SOURCE, type: 'error', error: 'OAuth session expired. Please try again.' },
      }),
      headers,
    )
  }

  if (error) {
    return htmlResponse(
      renderResultPage({
        origin,
        returnTo,
        payload: { source: MESSAGE_SOURCE, type: 'error', error: `GitHub authorization failed: ${error}` },
      }),
      headers,
    )
  }

  if (!state || state !== cookies[STATE_COOKIE] || !code) {
    return htmlResponse(
      renderResultPage({
        origin,
        returnTo,
        payload: { source: MESSAGE_SOURCE, type: 'error', error: 'GitHub callback validation failed.' },
      }),
      headers,
    )
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
    const message = tokenPayload.error_description || tokenPayload.error || 'GitHub token exchange failed.'
    return htmlResponse(
      renderResultPage({
        origin,
        returnTo,
        payload: { source: MESSAGE_SOURCE, type: 'error', error: message },
      }),
      headers,
    )
  }

  return htmlResponse(
    renderResultPage({
      origin,
      returnTo,
      payload: { source: MESSAGE_SOURCE, type: 'success', token: tokenPayload.access_token },
    }),
    headers,
  )
}

async function handleDeviceStart(request, env) {
  const requestUrl = new URL(request.url)
  const origin = requestUrl.searchParams.get('origin') || ''
  const allowedOrigins = getAllowedOrigins(env)

  if (!origin || !isAllowedOrigin(origin, allowedOrigins)) {
    return textResponse('Origin is not allowed.', 400)
  }

  const corsOrigin = getValidatedRequestOrigin(request, env, origin)
  if (!corsOrigin) {
    return textResponse('Origin is not allowed.', 400)
  }

  const githubClientId = assertEnv(env, 'GITHUB_CLIENT_ID')
  const scope = String(env.GITHUB_SCOPE || 'public_repo').trim() || 'public_repo'

  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: new URLSearchParams({
      client_id: githubClientId,
      scope,
    }).toString(),
  })

  const payload = await response.json()
  if (!response.ok || !payload.device_code) {
    return jsonResponse(
      {
        ok: false,
        error: payload.error_description || payload.error || 'Failed to start GitHub device flow.',
      },
      500,
      { headers: setCorsHeaders(createNoStoreHeaders(), corsOrigin) },
    )
  }

  return jsonResponse(
    {
      ok: true,
      deviceCode: payload.device_code,
      userCode: payload.user_code,
      verificationUri: payload.verification_uri,
      verificationUriComplete: payload.verification_uri_complete || null,
      expiresIn: payload.expires_in,
      interval: payload.interval || 5,
    },
    200,
    { headers: setCorsHeaders(createNoStoreHeaders(), corsOrigin) },
  )
}

async function handleDevicePoll(request, env) {
  const requestUrl = new URL(request.url)
  const origin = requestUrl.searchParams.get('origin') || ''
  const deviceCode = requestUrl.searchParams.get('device_code') || ''
  const allowedOrigins = getAllowedOrigins(env)

  if (!origin || !isAllowedOrigin(origin, allowedOrigins)) {
    return textResponse('Origin is not allowed.', 400)
  }

  const corsOrigin = getValidatedRequestOrigin(request, env, origin)
  if (!corsOrigin) {
    return textResponse('Origin is not allowed.', 400)
  }

  if (!deviceCode) {
    return jsonResponse(
      { ok: false, error: 'Missing device_code.' },
      400,
      { headers: setCorsHeaders(createNoStoreHeaders(), corsOrigin) },
    )
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: new URLSearchParams({
      client_id: assertEnv(env, 'GITHUB_CLIENT_ID'),
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }).toString(),
  })

  const payload = await response.json()
  if (payload.access_token) {
    return jsonResponse(
      { ok: true, status: 'success', token: payload.access_token },
      200,
      { headers: setCorsHeaders(createNoStoreHeaders(), corsOrigin) },
    )
  }

  if (payload.error === 'authorization_pending' || payload.error === 'slow_down') {
    return jsonResponse(
      {
        ok: true,
        status: 'pending',
        interval: payload.error === 'slow_down' ? 8 : 5,
      },
      200,
      { headers: setCorsHeaders(createNoStoreHeaders(), corsOrigin) },
    )
  }

  if (payload.error === 'expired_token') {
    return jsonResponse(
      { ok: false, status: 'expired', error: 'GitHub login expired. Please start again.' },
      410,
      { headers: setCorsHeaders(createNoStoreHeaders(), corsOrigin) },
    )
  }

  return jsonResponse(
    {
      ok: false,
      status: 'error',
      error: payload.error_description || payload.error || 'GitHub login failed.',
    },
    400,
    { headers: setCorsHeaders(createNoStoreHeaders(), corsOrigin) },
  )
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
          deviceFlow: Boolean(env.GITHUB_CLIENT_ID),
        })
      }

      if (url.pathname === '/auth/github/login') {
        return handleLogin(request, env)
      }

      if (url.pathname === '/auth/github/callback') {
        return handleCallback(request, env)
      }

      if (url.pathname === '/auth/github/device/start') {
        return handleDeviceStart(request, env)
      }

      if (url.pathname === '/auth/github/device/poll') {
        return handleDevicePoll(request, env)
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
