# Task Tracker — Frontend

React single-page application for managing projects and tasks. Built with Vite and styled with Tailwind CSS.

## Tech Stack

- **Framework:** React 19
- **Build tool:** Vite
- **Styling:** Tailwind CSS (v4)
- **Routing:** React Router v7
- **Testing:** Vitest + React Testing Library + jest-dom

## Project Structure

```
frontend/
├── index.html
├── vite.config.js          # Vite + Tailwind + API proxy + test config
└── src/
    ├── main.jsx            # App entry point (BrowserRouter)
    ├── App.jsx             # Route definitions
    ├── index.css           # Tailwind import
    ├── api.js              # API client functions
    ├── test-setup.js       # jest-dom setup for Vitest
    ├── pages/
    │   ├── ProjectList.jsx     # Home — list all projects
    │   ├── CreateProject.jsx   # Form to create a new project
    │   └── ProjectDetail.jsx   # Project view with tasks
    ├── components/
    │   ├── Navbar.jsx          # App header with navigation
    │   ├── ProjectCard.jsx     # Project summary card
    │   ├── TaskCard.jsx        # Task display with status/delete controls
    │   └── TaskForm.jsx        # Form to add a new task
    └── __tests__/
        ├── ProjectList.test.jsx
        ├── CreateProject.test.jsx
        ├── ProjectDetail.test.jsx
        ├── TaskCard.test.jsx
        └── TaskForm.test.jsx
```

## Setup

```bash
npm install
```

## Development Server

```bash
npm run dev
# Starts on http://localhost:5173
```

The Vite dev server proxies all `/api` requests to `http://localhost:3001`, so the backend must be running for API calls to work. The UI is still fully navigable without the backend — pages display error messages when API calls fail.

## Pages

| Route | Page | Description |
| --- | --- | --- |
| `/` | ProjectList | Displays all projects as cards |
| `/projects/new` | CreateProject | Form to create a new project |
| `/projects/:id` | ProjectDetail | Project info, task list, and task creation form |

## API Client (`src/api.js`)

Thin wrapper around `fetch()` with error handling. All functions throw with the server's error message on non-2xx responses.

| Function | Method | Endpoint |
| --- | --- | --- |
| `fetchProjects()` | GET | `/api/projects` |
| `fetchProject(id)` | GET | `/api/projects/:id` |
| `createProject(data)` | POST | `/api/projects` |
| `fetchTasks(projectId)` | GET | `/api/projects/:projectId/tasks` |
| `createTask(projectId, data)` | POST | `/api/projects/:projectId/tasks` |
| `updateTaskStatus(id, status)` | PATCH | `/api/tasks/:id/status` |
| `deleteTask(id)` | DELETE | `/api/tasks/:id` |

## Testing

```bash
npm install
npx vitest run
```

Runs 17 tests across 5 test files. All tests mock the `api.js` module — no backend needed.

### Test Coverage

- **ProjectList** — loading state, successful render, error state, empty state
- **CreateProject** — form rendering, successful submit + navigation, submit error
- **ProjectDetail** — project + task rendering, status update, task deletion, error state
- **TaskCard** — renders all fields, status change callback, delete callback
- **TaskForm** — renders all fields, submit callback with form data, form clears after submit

## Build

```bash
npm run build
# Output in dist/
```
