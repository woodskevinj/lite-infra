# Task Tracker — Backend

Express.js API server using the `pg` library to query PostgreSQL with raw SQL. Serves data to the React frontend.

## Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database driver:** pg (node-postgres)
- **Testing:** Jest + Supertest

## Project Structure

```
backend/
├── app.js              # Express app setup (middleware, routes)
├── server.js           # Entry point — starts the server
├── db.js               # PostgreSQL connection pool
├── schema.sql          # Database table definitions
├── jest.config.js       # Jest configuration
├── .env                # Database connection config (gitignored)
├── routes/
│   ├── projects.js     # Project CRUD routes
│   └── tasks.js        # Task CRUD routes
└── __tests__/
    ├── projects.test.js
    └── tasks.test.js
```

## Setup

```bash
npm install
```

### Environment Variables

Create a `.env` file (or edit the existing one) with your PostgreSQL connection details:

```
DB_USER=xxxxxx
DB_PASSWORD=xxxxxx
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tasktracker
PORT=3001
```

### Database Setup (when PostgreSQL is available)

1. Create the database:
   ```sql
   CREATE DATABASE tasktracker;
   ```
2. Run the schema:
   ```bash
   psql -d tasktracker -f schema.sql
   ```

The server starts and responds even without a running database. All routes return `{ "error": "Database unavailable" }` with status 500 when the database is unreachable.

## Running the Server

```bash
node server.js
# Server running on port 3001
```

## API Routes

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health` | Health check — returns `{"status":"ok"}`, no DB required |
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/:id` | Get a single project |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:projectId/tasks` | List tasks for a project |
| POST | `/api/projects/:projectId/tasks` | Create a task |
| PATCH | `/api/tasks/:id/status` | Update task status |
| DELETE | `/api/tasks/:id` | Delete a task |

### Example requests

```bash
# Create a project
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project", "description": "A test project"}'

# Create a task
curl -X POST http://localhost:3001/api/projects/1/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "First task", "status": "todo", "due_date": "2025-12-31"}'

# Update task status
curl -X PATCH http://localhost:3001/api/tasks/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

## Testing

```bash
npm install
npm test
```

Runs 16 tests across 2 test files. All tests mock the database — no PostgreSQL connection needed.

### Test Coverage

- **projects.test.js** — GET all, GET by ID (found + not found), POST (success + missing name), DB error handling
- **tasks.test.js** — GET by project, POST (success + missing title + invalid status), PATCH status (success + invalid + not found), DELETE (success + not found)

## Architecture Notes

- `app.js` exports the Express app without calling `listen()`, so it can be imported by both `server.js` (production) and test files (via Supertest)
- All routes use parameterized queries (`$1`, `$2`) to prevent SQL injection
- Every route wraps its database query in try/catch for graceful error handling
- The `pg` Pool is configured with `ssl: { rejectUnauthorized: false }` to satisfy RDS PostgreSQL 16's SSL requirement. The pool is lazy — no connection is opened until a route calls `pool.query()`
