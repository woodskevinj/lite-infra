import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TaskForm from '../components/TaskForm';

describe('TaskForm', () => {
  it('renders all form fields', () => {
    render(<TaskForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
  });

  it('calls onSubmit with form data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TaskForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/title/i), 'My Task');
    await user.type(screen.getByLabelText(/description/i), 'Details');
    await user.selectOptions(screen.getByLabelText(/status/i), 'in_progress');
    await user.type(screen.getByLabelText(/due date/i), '2025-07-01');
    await user.click(screen.getByRole('button', { name: /add task/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'My Task',
      description: 'Details',
      status: 'in_progress',
      due_date: '2025-07-01',
    });
  });

  it('clears the form after submission', async () => {
    const user = userEvent.setup();
    render(<TaskForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/title/i), 'My Task');
    await user.click(screen.getByRole('button', { name: /add task/i }));

    expect(screen.getByLabelText(/title/i)).toHaveValue('');
  });
});
