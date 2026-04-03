// ============================================================
//  PROJECT ZERO — Notion Proxy API
//  Deploy this as a Netlify Function (netlify/functions/notion.js)
//  or as a Vercel Serverless Function (api/notion.js)
//
//  Environment Variables Required:
//    NOTION_TOKEN          — your Notion integration token
//    NOTION_LEADS_DB       — Notion database ID for leads
//    NOTION_PURCHASES_DB   — Notion database ID for purchases
//    NOTION_SUMMARY_DB     — Notion database ID for daily summary
//    PROXY_SECRET          — a secret string to prevent abuse
// ============================================================

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Notion token not configured' }) };
  }

  const notionHeaders = {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };

  try {
    let result;

    // ── ADD LEAD ────────────────────────────────────────────
    if (body.action === 'add_lead') {
      const dbId = process.env.NOTION_LEADS_DB;
      if (!dbId) throw new Error('NOTION_LEADS_DB not set');

      const payload = {
        parent: { database_id: dbId },
        properties: {
          'Email': { title: [{ text: { content: body.email || '' } }] },
          'Session ID': { rich_text: [{ text: { content: body.session_id || '' } }] },
          'Timestamp': { date: { start: body.timestamp || new Date().toISOString() } },
          'Status': { select: { name: 'Lead' } },
        },
      };

      const res = await fetch(`${NOTION_API}/pages`, {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify(payload),
      });
      result = await res.json();
    }

    // ── ADD PURCHASE ────────────────────────────────────────
    else if (body.action === 'add_purchase') {
      const dbId = process.env.NOTION_PURCHASES_DB;
      if (!dbId) throw new Error('NOTION_PURCHASES_DB not set');

      const payload = {
        parent: { database_id: dbId },
        properties: {
          'Email': { title: [{ text: { content: body.email || '' } }] },
          'Amount': { number: parseFloat(body.amount) || 0 },
          'Transaction ID': { rich_text: [{ text: { content: body.txId || '' } }] },
          'Timestamp': { date: { start: body.timestamp || new Date().toISOString() } },
          'Status': { select: { name: 'Completed' } },
        },
      };

      const res = await fetch(`${NOTION_API}/pages`, {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify(payload),
      });
      result = await res.json();
    }

    // ── DAILY SUMMARY ───────────────────────────────────────
    else if (body.action === 'daily_summary') {
      const dbId = process.env.NOTION_SUMMARY_DB;
      if (!dbId) throw new Error('NOTION_SUMMARY_DB not set');

      const payload = {
        parent: { database_id: dbId },
        properties: {
          'Date': { title: [{ text: { content: body.date || new Date().toISOString().slice(0,10) } }] },
          'Total Visitors': { number: parseInt(body.total_visitors) || 0 },
          'Total Leads': { number: parseInt(body.total_leads) || 0 },
          'Total Customers': { number: parseInt(body.total_customers) || 0 },
          'Revenue (USD)': { number: parseFloat(body.total_revenue) || 0 },
          'Conversion Rate (%)': { number: parseFloat(body.conversion_rate) || 0 },
        },
      };

      const res = await fetch(`${NOTION_API}/pages`, {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify(payload),
      });
      result = await res.json();
    }

    else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, result }) };

  } catch (err) {
    console.error('[Notion Proxy Error]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
