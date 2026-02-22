import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TaskCard from '../components/TaskCard';

const mockTask = {
  id: 1,
  title: 'Test Task',
  description: 'A description',
  status: 'todo',
  due_date: '2025-06-15',
};

describe('TaskCard', () => {
  it('renders task title, description, status, and due date', () => {
    render(<TaskCard task={mockTask} onStatusChange={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('A description')).toBeInTheDocument();
    const badge = screen.getByText('To Do', { selector: 'span' });
    expect(badge).toBeInTheDocument();
    expect(screen.getByText(/Due:/)).toBeInTheDocument();
  });

  it('calls onStatusChange when status dropdown changes', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();

    render(<TaskCard task={mockTask} onStatusChange={onStatusChange} onDelete={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText('Change status'), 'in_progress');

    expect(onStatusChange).toHaveBeenCalledWith(1, 'in_progress');
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<TaskCard task={mockTask} onStatusChange={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByText('Delete'));

    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
