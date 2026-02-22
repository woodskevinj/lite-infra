const API_BASE = '/api';

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export async function fetchProjects() {
  const res = await fetch(`${API_BASE}/projects`);
  return handleResponse(res);
}

export async function fetchProject(id) {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  return handleResponse(res);
}

export async function createProject({ name, description }) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  return handleResponse(res);
}

export async function fetchTasks(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`);
  return handleResponse(res);
}

export async function createTask(projectId, { title, description, status, due_date }) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, status, due_date }),
  });
  return handleResponse(res);
}

export async function updateTaskStatus(id, status) {
  const res = await fetch(`${API_BASE}/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

export async function deleteTask(id) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}
