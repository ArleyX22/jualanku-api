// api/items.js
const { query } = require('../lib/db');
const auth = require('./auth');

// Helper: Set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// GET /api/items → semua item milik user
module.exports.get = async (req, res) => {
  setCorsHeaders(res); // ✅ Tambahkan CORS di setiap handler

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const result = await query(
      'SELECT * FROM items WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/items → tambah item
module.exports.post = async (req, res) => {
  setCorsHeaders(res); // ✅ Tambahkan CORS di setiap handler

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { name, qty } = req.body;
    if (!name || qty == null) {
      return res.status(400).json({ error: 'name and qty required' });
    }

    const result = await query(
      'INSERT INTO items (name, qty, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, qty, req.user.id]
    );

    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/items/:id → update item
module.exports.put = async (req, res) => {
  setCorsHeaders(res); // ✅ Tambahkan CORS di setiap handler

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id } = req.query;
    const { name, qty } = req.body;

    const result = await query(
      'UPDATE items SET name = $1, qty = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [name, qty, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found or not owned' });
    }

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/items/:id
module.exports.delete = async (req, res) => {
  setCorsHeaders(res); // ✅ Tambahkan CORS di setiap handler

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id } = req.query;

    const result = await query(
      'DELETE FROM items WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found or not owned' });
    }

    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Export sebagai Vercel handler
module.exports = async (req, res) => {
  setCorsHeaders(res); // ✅ Tambahkan juga di root handler

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Proteksi semua route kecuali OPTIONS
  if (req.method !== 'OPTIONS') {
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }).catch(() => {
      return; // sudah di-handle di auth.js
    });
    if (res.headersSent) return;
  }

  switch (req.method) {
    case 'GET':
      return module.exports.get(req, res);
    case 'POST':
      return module.exports.post(req, res);
    case 'PUT':
      return module.exports.put(req, res);
    case 'DELETE':
      return module.exports.delete(req, res);
    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
};