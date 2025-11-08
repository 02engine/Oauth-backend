// netlify/functions/token.js
exports.handler = async (event) => {
  // 1. CORS 预检
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: ''
    };
  }

  // 2. 仅允许 POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Method Not Allowed' };
  }

  // 3. 强制检查 Content-Type
  const contentType = event.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Invalid Content-Type',
        expected: 'application/json',
        received: contentType
      })
    };
  }

  // 4. 解析 JSON
  let body;
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

  // 5. 读取参数
  const { code, code_verifier, client_id, redirect_uri } = body;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;  // 环境变量

  // 6. 必填检查
  if (!code || !code_verifier || !client_id || !redirect_uri || !client_secret) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Missing required fields',
        missing: {
          code: !code,
          code_verifier: !code_verifier,
          client_id: !client_id,
          redirect_uri: !redirect_uri,
          client_secret: !client_secret
        },
        tip: '检查 Netlify 环境变量 GITHUB_CLIENT_SECRET'
      })
    };
  }

  // 7. 构造 GitHub 请求
  const params = new URLSearchParams({
    client_id,
    client_secret,
    code,
    code_verifier,
    redirect_uri
  });

  // 8. 调用 GitHub
  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params
    });

    const data = await res.json();

    if (data.error) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'GitHub OAuth Error',
          github_error: data.error,
          description: data.error_description
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', details: e.message })
    };
  }
};