// netlify/functions/steam.js
// Proxies Steam Store search API to bypass browser CORS restrictions
// Endpoint: /.netlify/functions/steam?tag=roguelike&count=20

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const tag = event.queryStringParameters?.tag;
  const count = Math.min(parseInt(event.queryStringParameters?.count || '20'), 50);

  if (!tag) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'tag parameter is required' }),
    };
  }

  try {
    // Steam store search by tag
    const url = `https://store.steampowered.com/search/results/?tags=${encodeURIComponent(tag)}&json=1&count=${count}&cc=US&l=en`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GameRouletteBot/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Steam returned ${res.status}`);
    }

    const raw = await res.text();

    // Steam returns either JSON or HTML — parse carefully
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Steam returned non-JSON response');
    }

    // Extract game items from Steam's response
    // Steam search results come back as HTML in data.results_html
    // Parse it to pull out app IDs and names
    const items = [];

    if (data.results_html) {
      // Extract appids and names from the HTML blob using regex
      const appIdRe = /data-ds-appid="(\d+)"/g;
      const nameRe = /class="title"[^>]*>([^<]+)<\/span>/g;
      const imgRe = /src="https:\/\/cdn\.akamai\.steamstatic\.com\/steam\/apps\/(\d+)\/capsule_sm_120\.jpg"/g;

      const appIds = [];
      const names = [];
      let m;

      while ((m = appIdRe.exec(data.results_html)) !== null) appIds.push(m[1]);
      while ((m = nameRe.exec(data.results_html)) !== null) names.push(m[1].trim());

      for (let i = 0; i < Math.min(appIds.length, names.length, count); i++) {
        items.push({
          appid: appIds[i],
          name: names[i],
          icon: `https://cdn.akamai.steamstatic.com/steam/apps/${appIds[i]}/capsule_sm_120.jpg`,
        });
      }
    }

    if (items.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ items: [], message: 'No games found for this tag' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ items, total: data.total_count || items.length }),
    };

  } catch (err) {
    console.error('Steam proxy error:', err);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: err.message || 'Failed to fetch from Steam' }),
    };
  }
};
