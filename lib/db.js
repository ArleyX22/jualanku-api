// lib/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_PUBLIC,
  ssl: {
    rejectUnauthorized: false // Railway butuh ini
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};