const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching projects:', err.message);
    res.status(500).json({ error: 'Database unavailable' });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching project:', err.message);
    res.status(500).json({ error: 'Database unavailable' });
  }
});

router.post('/projects', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    const result = await pool.query(
      'INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating project:', err.message);
    res.status(500).json({ error: 'Database unavailable' });
  }
});

module.exports = router;
