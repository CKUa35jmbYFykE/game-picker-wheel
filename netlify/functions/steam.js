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
    // Use Steam's search endpoint with the tag as a search term AND as a tag filter
    // Two strategies tried in sequence for resilience
    const items = await fetchByTag(tag, count) || await fetchByTerm(tag, count);

    if (!items || items.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ items: [], message: 'No games found for this tag' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ items }),
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

// Strategy 1: Search using Steam's tag filter (tag ID lookup not needed — term works)
async function fetchByTag(tag, count) {
  try {
    const url = `https://store.steampowered.com/search/results/?term=${encodeURIComponent(tag)}&json=1&count=${count}&cc=US&l=english&category1=998`;
    const res = await fetch(url, { headers: steamHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return parseResultsHtml(data.results_html, count);
  } catch {
    return null;
  }
}

// Strategy 2: Plain term search — broader but reliable
async function fetchByTerm(tag, count) {
  try {
    const url = `https://store.steampowered.com/search/results/?term=${encodeURIComponent(tag)}&json=1&count=${count}&cc=US&l=english`;
    const res = await fetch(url, { headers: steamHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return parseResultsHtml(data.results_html, count);
  } catch {
    return null;
  }
}

function steamHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://store.steampowered.com/',
  };
}

function parseResultsHtml(html, count) {
  if (!html) return null;
  const items = [];

  // Match app entries — Steam wraps each result in an <a> with data-ds-appid
  // We extract appid, then derive name from the inner span
  // Multiple regex patterns for resilience across Steam HTML variations

  // Pattern A: data-ds-appid paired with a title span nearby
  const blockRe = /data-ds-appid="(\d+)"[\s\S]{0,800}?<span[^>]+class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/g;
  let m;
  while ((m = blockRe.exec(html)) !== null && items.length < count) {
    const appid = m[1];
    const name = m[2].trim();
    if (appid && name && !items.find(i => i.appid === appid)) {
      items.push({
        appid,
        name,
        icon: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_sm_120.jpg`,
      });
    }
  }

  // Pattern B: fallback — grab all appids and all titles separately, zip them
  if (items.length === 0) {
    const appIds = [...html.matchAll(/data-ds-appid="(\d+)"/g)].map(m => m[1]);
    // Try different title class patterns Steam has used
    const titlePatterns = [
      /class="[^"]*title[^"]*"[^>]*>\s*([^<]+)\s*<\/span>/g,
      /class="[^"]*search_name[^"]*"[^>]*>\s*([^<]+)\s*<\//g,
      /<span[^>]+>\s*([A-Z][^<]{2,60})\s*<\/span>/g,
    ];

    let names = [];
    for (const pattern of titlePatterns) {
      names = [...html.matchAll(pattern)].map(m => m[1].trim()).filter(n => n.length > 1);
      if (names.length > 0) break;
    }

    for (let i = 0; i < Math.min(appIds.length, names.length, count); i++) {
      items.push({
        appid: appIds[i],
        name: names[i],
        icon: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appIds[i]}/capsule_sm_120.jpg`,
      });
    }
  }

  return items.length > 0 ? items : null;
}
