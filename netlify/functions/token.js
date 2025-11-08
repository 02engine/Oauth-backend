// netlify/functions/token.js
exports.handler = async (event) => {
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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid JSON', details: e.message })
    };
  }

  const { code, code_verifier, client_id, redirect_uri } = body;

  // 临时硬编码（仅测试！）
  const client_secret = "e2807a9df979ba4cc5204ea67f67da5cad6df654";  // ← 替换这里！

  if (!code || !code_verifier || !client_id || !redirect_uri) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Missing fields',
        received: { code: !!code, code_verifier: !!code_verifier, client_id: !!client_id, redirect_uri: !!redirect_uri }
      })
    };
  }

  const params = new URLSearchParams({
    client_id,
    client_secret,  // 硬编码
    code,
    code_verifier,
    redirect_uri
  });

  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params
    });

    const data = await res.json();

    if (data.error) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'GitHub Error',
          github_error: data.error,
          description: data.error_description
        })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        access_token: data.access_token,
        token_type: data.token_type
      })
    };
  } catch (e) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: e.message }) };
  }
};