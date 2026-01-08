// api/items.js
const { query } = require('../lib/db'); // ✅ Pastikan ini ada
const auth = require('./auth');          // ✅ Pastikan auth.js ada dan benar

// Helper: Set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// GET /api/items → semua item milik user
module.exports.get = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ✅ Pastikan req.user ada (dari middleware auth)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: user ID missing' });
    }

    const result = await query(
      'SELECT id, name, qty FROM items WHERE user_id = $1 ORDER BY id DESC',
      [req.user.id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /items error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/items → tambah item
module.exports.post = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, qty } = req.body;
    if (!name || qty == null || qty < 0) {
      return res.status(400).json({ error: 'name and qty (>=0) required' });
    }

    const result = await query(
      'INSERT INTO items (name, qty, user_id) VALUES ($1, $2, $3) RETURNING id, name, qty',
      [name.trim(), parseInt(qty), req.user.id]
    );

    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error('POST /items error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/items?id=123
module.exports.put = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseInt(req.query.id);
    if (!id || id <= 0) {
      return res.status(400).json({ error: 'Valid item ID required' });
    }

    const { name, qty } = req.body;
    if (!name || qty == null || qty < 0) {
      return res.status(400).json({ error: 'name and qty (>=0) required' });
    }

    const result = await query(
      'UPDATE items SET name = $1, qty = $2 WHERE id = $3 AND user_id = $4 RETURNING id, name, qty',
      [name.trim(), parseInt(qty), id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found or not owned' });
    }

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('PUT /items error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/items?id=123
module.exports.delete = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseInt(req.query.id);
    if (!id || id <= 0) {
      return res.status(400).json({ error: 'Valid item ID required' });
    }

    const result = await query(
      'DELETE FROM items WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found or not owned' });
    }

    res.json({ message: 'Item deleted', id });
  } catch (err) {
    console.error('DELETE /items error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Root handler for Vercel
module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ✅ Pastikan auth middleware jalan
  try {
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) {
          console.error('Auth middleware error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (err) {
    // Jika auth gagal, res sudah dikirim oleh middleware — jangan lanjutkan
    if (res.headersSent) return;
    return res.status(500).json({ error: 'Auth failed' });
  }

  // Lanjutkan ke handler spesifik
  switch (req.method) {
    case 'GET': return module.exports.get(req, res);
    case 'POST': return module.exports.post(req, res);
    case 'PUT': return module.exports.put(req, res);
    case 'DELETE': return module.exports.delete(req, res);
    default: return res.status(405).json({ error: 'Method not allowed' });
  }
};