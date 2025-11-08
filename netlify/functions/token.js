// netlify/functions/token.js
exports.handler = async (event) => {
  // 1. CORS 预检
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Origin',
      },
      body: ''
    };
  }

  // 2. 仅允许 POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Method Not Allowed',
        allowed: 'POST',
        received: event.httpMethod
      })
    };
  }

  // 3. 解析请求体
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Invalid JSON',
        details: e.message,
        raw_body: event.body
      })
    };
  }

  // 4. 读取参数
  const { code, code_verifier, client_id, redirect_uri } = body;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;

  // 5. 详细检查必填字段
  const missing = [];
  if (!code) missing.push('code');
  if (!code_verifier) missing.push('code_verifier');
  if (!client_id) missing.push('client_id');
  if (!redirect_uri) missing.push('redirect_uri');
  if (!client_secret) missing.push('GITHUB_CLIENT_SECRET (环境变量)');

  if (missing.length > 0) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Missing required fields',
        missing_fields: missing,
        received: {
          code: code ? 'present' : 'missing',
          code_verifier: code_verifier ? 'present' : 'missing',
          client_id: client_id ? 'present' : 'missing',
          redirect_uri: redirect_uri ? 'present' : 'missing',
          has_client_secret: !!client_secret
        },
        tip: '检查前端 fetch body 和 Netlify 环境变量'
      })
    };
  }

  // 6. 构造 GitHub 请求
  const params = new URLSearchParams({
    client_id,
    client_secret,
    code,
    code_verifier,
    redirect_uri
  });

  // 7. 调用 GitHub API
  let githubResponse;
  try {
    githubResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'OAuth-App-Netlify'
      },
      body: params
    });
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Failed to reach GitHub',
        details: e.message
      })
    };
  }

  // 8. 解析 GitHub 响应
  let githubData;
  try {
    githubData = await githubResponse.json();
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'GitHub returned invalid JSON',
        status: githubResponse.status,
        raw: await githubResponse.text()
      })
    };
  }

  // 9. GitHub 返回错误
  if (githubData.error) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'GitHub OAuth Error',
        github_error: githubData.error,
        description: githubData.error_description,
        uri: githubData.error_uri,
        your_request: {
          client_id: client_id.substring(0, 6) + '...',
          redirect_uri,
          code: code.substring(0, 10) + '...'
        },
        tip: '检查 GitHub OAuth App 设置中的回调 URL 是否精确匹配'
      })
    };
  }

  // 10. 成功！
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      access_token: githubData.access_token,
      token_type: githubData.token_type,
      scope: githubData.scope
    })
  };
};