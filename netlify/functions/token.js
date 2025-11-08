// netlify/functions/token.js
exports.handler = async (event) => {
  // CORS 预检
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
    body = JSON
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  const { code, code_verifier, client_id, redirect_uri } = body;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;

  if (!code || !code_verifier || !client_id || !client_secret || !redirect_uri) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Missing required fields',
        received: { code: !!code, code_verifier: !!code_verifier, client_id: !!client_id, redirect_uri: !!redirect_uri, has_secret: !!client_secret }
      })
    };
  }

  const params = new URLSearchParams({
    client_id,
    client_secret,
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
        'User-Agent': 'OAuth-App'
      },
      body: params
    });

    const data = await res.json();

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
      body: JSON.stringify({ error: e.message })
    };
  }
};