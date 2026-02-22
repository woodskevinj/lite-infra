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

describe('GET /api/projects', () => {
  it('returns a list of projects', async () => {
    const mockProjects = [
      { id: 1, name: 'Project A', description: 'Desc A', created_at: '2025-01-01' },
      { id: 2, name: 'Project B', description: null, created_at: '2025-01-02' },
    ];
    pool.query.mockResolvedValue({ rows: mockProjects });

    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockProjects);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM projects ORDER BY created_at DESC');
  });

  it('returns 500 when the database is unavailable', async () => {
    pool.query.mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Database unavailable' });
  });
});

describe('GET /api/projects/:id', () => {
  it('returns a single project', async () => {
    const mockProject = { id: 1, name: 'Project A', description: 'Desc', created_at: '2025-01-01' };
    pool.query.mockResolvedValue({ rows: [mockProject] });

    const res = await request(app).get('/api/projects/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockProject);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM projects WHERE id = $1', ['1']);
  });

  it('returns 404 when project is not found', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await request(app).get('/api/projects/999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Project not found' });
  });
});

describe('POST /api/projects', () => {
  it('creates and returns a new project', async () => {
    const newProject = { id: 3, name: 'New Project', description: 'New desc', created_at: '2025-01-03' };
    pool.query.mockResolvedValue({ rows: [newProject] });

    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'New Project', description: 'New desc' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(newProject);
    expect(pool.query).toHaveBeenCalledWith(
      'INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *',
      ['New Project', 'New desc']
    );
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ description: 'No name' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Project name is required' });
    expect(pool.query).not.toHaveBeenCalled();
  });
});
