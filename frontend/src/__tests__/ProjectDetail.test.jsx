import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ProjectDetail from '../pages/ProjectDetail';
import * as api from '../api';

vi.mock('../api');

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/projects/1']}>
      <Routes>
        <Route path="/projects/:id" element={<ProjectDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

const mockProject = { id: 1, name: 'Project A', description: 'Desc A', created_at: '2025-01-01' };
const mockTasks = [
  { id: 10, project_id: 1, title: 'Task 1', description: 'Do stuff', status: 'todo', due_date: '2025-06-01', created_at: '2025-01-01' },
  { id: 11, project_id: 1, title: 'Task 2', description: '', status: 'done', due_date: null, created_at: '2025-01-02' },
];

describe('ProjectDetail', () => {
  it('renders project info and task list', async () => {
    api.fetchProject.mockResolvedValue(mockProject);
    api.fetchTasks.mockResolvedValue(mockTasks);

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument();
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Tasks (2)')).toBeInTheDocument();
    });
  });

  it('handles task status update', async () => {
    const user = userEvent.setup();
    api.fetchProject.mockResolvedValue(mockProject);
    api.fetchTasks.mockResolvedValue([mockTasks[0]]);
    api.updateTaskStatus.mockResolvedValue({ ...mockTasks[0], status: 'done' });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Change status');
    await user.selectOptions(select, 'done');

    await waitFor(() => {
      expect(api.updateTaskStatus).toHaveBeenCalledWith(10, 'done');
    });
  });

  it('handles task deletion', async () => {
    const user = userEvent.setup();
    api.fetchProject.mockResolvedValue(mockProject);
    api.fetchTasks.mockResolvedValue([mockTasks[0]]);
    api.deleteTask.mockResolvedValue({ message: 'Task deleted' });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(api.deleteTask).toHaveBeenCalledWith(10);
      expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    });
  });

  it('shows error state when fetch fails', async () => {
    api.fetchProject.mockRejectedValue(new Error('Database unavailable'));
    api.fetchTasks.mockRejectedValue(new Error('Database unavailable'));

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText(/Could not load project/)).toBeInTheDocument();
    });
  });
});
