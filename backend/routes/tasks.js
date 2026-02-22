const express = require('express');
const router = express.Router();
const pool = require('../db');

const VALID_STATUSES = ['todo', 'in_progress', 'done'];

router.get('/projects/:projectId/tasks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err.message);
    res.status(500).json({ error: 'Database unavailable' });
  }
});

router.post('/projects/:projectId/tasks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, status, due_date } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }
    const taskStatus = status || 'todo';
    if (!VALID_STATUSES.includes(taskStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    const result = await pool.query(
      'INSERT INTO tasks (project_id, title, description, status, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [projectId, title, description || null, taskStatus, due_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating task:', err.message);
    res.status(500).json({ error: 'Database unavailable' });
  }
});

router.patch('/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    const result = await pool.query(
      'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating task status:', err.message);
    res.status(500).json({ error: 'Database unavailable' });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Error deleting task:', err.message);
    res.status(500).json({ error: 'Database unavailable' });
  }
});

module.exports = router;
