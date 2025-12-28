const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

// Health check (Render needs this)
app.get("/", (req, res) => {
  res.send("OrgChart API is running");
});

// Org chart endpoint
app.get("/api/orgchart", async (req, res) => {
  try {
    const query = `
      SELECT
        p.position_number AS id,
        rp.position_number AS "parentId",
        '(' || p.position_number || ')/' ||
        p.title || '/' ||
        COALESCE(e.first_name || ' ' || e.last_name, 'VACANT') AS label,
        d.name AS department,
        l.name AS location,
        p.yearly_salary AS salary,
        p.is_vacant AS vacant,
        p.combo_code AS "comboCode"
      FROM positions p
      LEFT JOIN positions rp ON p.reports_to_position_id = rp.id
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN locations l ON p.location_id = l.id
      LEFT JOIN employees e ON e.position_id = p.id
      ORDER BY "parentId", p.title, p.position_number;
    `;

    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load org chart data" });
  }
});

// Render provides PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OrgChart API running on port ${PORT}`);
});
