const { query } = require('../lib/db');
const auth = require('./auth');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Define handlers as separate functions
const getItems = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const result = await query(
      'SELECT id, name, qty FROM items WHERE user_id = $1 ORDER BY id DESC',
      [req.user.id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /items:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const postItem = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
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
    console.error('POST /items:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const putItem = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const id = parseInt(req.query.id);
    if (!id || id <= 0) return res.status(400).json({ error: 'Valid item ID required' });
    const { name, qty } = req.body;
    if (!name || qty == null || qty < 0) {
      return res.status(400).json({ error: 'name and qty (>=0) required' });
    }
    const result = await query(
      'UPDATE items SET name = $1, qty = $2 WHERE id = $3 AND user_id = $4 RETURNING id, name, qty',
      [name.trim(), parseInt(qty), id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('PUT /items:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteItem = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const id = parseInt(req.query.id);
    if (!id || id <= 0) return res.status(400).json({ error: 'Valid item ID required' });
    const result = await query(
      'DELETE FROM items WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted', id });
  } catch (err) {
    console.error('DELETE /items:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Root handler for Vercel
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Auth failed' });
    return;
  }

  switch (req.method) {
    case 'GET': return getItems(req, res);
    case 'POST': return postItem(req, res);
    case 'PUT': return putItem(req, res);
    case 'DELETE': return deleteItem(req, res);
    default: return res.status(405).json({ error: 'Method not allowed' });
  }
};