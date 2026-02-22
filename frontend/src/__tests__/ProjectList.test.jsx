import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ProjectList from '../pages/ProjectList';
import * as api from '../api';

vi.mock('../api');

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ProjectList', () => {
  it('shows loading state', () => {
    api.fetchProjects.mockReturnValue(new Promise(() => {}));
    renderWithRouter(<ProjectList />);
    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  });

  it('renders project cards after successful fetch', async () => {
    api.fetchProjects.mockResolvedValue([
      { id: 1, name: 'Project A', description: 'Desc A', created_at: '2025-01-01' },
      { id: 2, name: 'Project B', description: 'Desc B', created_at: '2025-01-02' },
    ]);

    renderWithRouter(<ProjectList />);

    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument();
      expect(screen.getByText('Project B')).toBeInTheDocument();
    });
  });

  it('renders error message when fetch fails', async () => {
    api.fetchProjects.mockRejectedValue(new Error('Database unavailable'));

    renderWithRouter(<ProjectList />);

    await waitFor(() => {
      expect(screen.getByText(/Could not load projects/)).toBeInTheDocument();
      expect(screen.getByText(/Database unavailable/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no projects exist', async () => {
    api.fetchProjects.mockResolvedValue([]);

    renderWithRouter(<ProjectList />);

    await waitFor(() => {
      expect(screen.getByText(/No projects yet/)).toBeInTheDocument();
    });
  });
});
