import { useState } from 'react';

function TaskForm({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      status,
      due_date: dueDate || null,
    });
    setTitle('');
    setDescription('');
    setStatus('todo');
    setDueDate('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">Add Task</h3>
      <div>
        <label htmlFor="task-title" className="block text-sm font-medium text-gray-700">
          Title *
        </label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="task-description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="task-status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="task-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="task-due-date" className="block text-sm font-medium text-gray-700">
            Due Date
          </label>
          <input
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
      >
        Add Task
      </button>
    </form>
  );
}

export default TaskForm;
