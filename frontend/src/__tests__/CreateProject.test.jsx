import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import CreateProject from '../pages/CreateProject';
import * as api from '../api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('../api');

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('CreateProject', () => {
  it('renders form fields', () => {
    renderWithRouter(<CreateProject />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
  });

  it('submits form and navigates on success', async () => {
    const user = userEvent.setup();
    api.createProject.mockResolvedValue({ id: 1, name: 'Test', description: '' });

    renderWithRouter(<CreateProject />);

    await user.type(screen.getByLabelText(/name/i), 'Test');
    await user.type(screen.getByLabelText(/description/i), 'A test project');
    await user.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(api.createProject).toHaveBeenCalledWith({
        name: 'Test',
        description: 'A test project',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message on submit failure', async () => {
    const user = userEvent.setup();
    api.createProject.mockRejectedValue(new Error('Database unavailable'));

    renderWithRouter(<CreateProject />);

    await user.type(screen.getByLabelText(/name/i), 'Test');
    await user.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(screen.getByText(/Database unavailable/)).toBeInTheDocument();
    });
  });
});
