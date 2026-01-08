// api/register.js
const { query } = require('../lib/db'); // ✅ WAJIB: import query
const bcrypt = require('bcryptjs');       // ✅ WAJIB: import bcrypt

module.exports = async (req, res) => {
  // ✅ CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashed]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // unique violation (username/email duplikat)
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    console.error('Register error:', err); // ✅ Logging detail
    res.status(500).json({ error: 'Server error' });
  }
};