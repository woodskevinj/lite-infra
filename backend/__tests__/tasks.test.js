const request = require('supertest');
const app = require('../app');
const pool = require('../db');

jest.mock('../db', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

afterEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/projects/:projectId/tasks', () => {
  it('returns tasks for a project', async () => {
    const mockTasks = [
      { id: 1, project_id: 1, title: 'Task 1', status: 'todo', created_at: '2025-01-01' },
      { id: 2, project_id: 1, title: 'Task 2', status: 'done', created_at: '2025-01-02' },
    ];
    pool.query.mockResolvedValue({ rows: mockTasks });

    const res = await request(app).get('/api/projects/1/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockTasks);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC',
      ['1']
    );
  });

  it('returns 500 when the database is unavailable', async () => {
    pool.query.mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/api/projects/1/tasks');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Database unavailable' });
  });
});

describe('POST /api/projects/:projectId/tasks', () => {
  it('creates a task', async () => {
    const newTask = {
      id: 3, project_id: 1, title: 'New Task', description: 'Desc',
      status: 'todo', due_date: '2025-06-01', created_at: '2025-01-03',
    };
    pool.query.mockResolvedValue({ rows: [newTask] });

    const res = await request(app)
      .post('/api/projects/1/tasks')
      .send({ title: 'New Task', description: 'Desc', due_date: '2025-06-01' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(newTask);
    expect(pool.query).toHaveBeenCalledWith(
      'INSERT INTO tasks (project_id, title, description, status, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['1', 'New Task', 'Desc', 'todo', '2025-06-01']
    );
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/projects/1/tasks')
      .send({ description: 'No title' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Task title is required' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .post('/api/projects/1/tasks')
      .send({ title: 'Task', status: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid status/);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/tasks/:id/status', () => {
  it('updates task status', async () => {
    const updatedTask = { id: 1, title: 'Task 1', status: 'done' };
    pool.query.mockResolvedValue({ rows: [updatedTask] });

    const res = await request(app)
      .patch('/api/tasks/1/status')
      .send({ status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(updatedTask);
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
      ['done', '1']
    );
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .patch('/api/tasks/1/status')
      .send({ status: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid status/);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns 404 when task is not found', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .patch('/api/tasks/999/status')
      .send({ status: 'done' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes a task and returns 200', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1 }] });

    const res = await request(app).delete('/api/tasks/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Task deleted' });
    expect(pool.query).toHaveBeenCalledWith(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      ['1']
    );
  });

  it('returns 404 when task does not exist', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await request(app).delete('/api/tasks/999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });
});
