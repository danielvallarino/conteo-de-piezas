const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

const STORE_NAME = "dashboard-piezas";
const STORE_KEY = "conteo-actual";

function getBlobOptions() {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.NETLIFY_API_TOKEN;

  return siteID && token ? { siteID, token } : undefined;
}

function cleanPieces(value) {
  if (!Array.isArray(value)) return null;

  const pieces = value
    .map((item) => ({
      name: String(item?.name || "").trim(),
      count: Math.max(0, Math.round(Number(item?.count) || 0)),
      family: String(item?.family || "Otros").trim() || "Otros"
    }))
    .filter((item) => item.name);

  return pieces.length ? pieces : null;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  let store;
  try {
    const { getStore } = await import("@netlify/blobs");
    const options = getBlobOptions();
    store = options ? getStore(STORE_NAME, options) : getStore(STORE_NAME);
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Netlify Blobs no esta configurado",
        details:
          "Agrega NETLIFY_SITE_ID y NETLIFY_BLOBS_TOKEN en Site configuration > Environment variables.",
        message: error.message
      })
    };
  }

  if (event.httpMethod === "GET") {
    const saved = await store.get(STORE_KEY, { type: "json" });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(saved || { pieces: null, updatedAt: null })
    };
  }

  if (event.httpMethod === "POST" || event.httpMethod === "PUT") {
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "JSON invalido" })
      };
    }

    const pieces = cleanPieces(payload.pieces);
    if (!pieces) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Lista de piezas invalida" })
      };
    }

    const record = {
      pieces,
      updatedAt: new Date().toISOString()
    };

    await store.setJSON(STORE_KEY, record);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(record)
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Metodo no permitido" })
  };
};
