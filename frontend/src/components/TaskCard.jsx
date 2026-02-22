const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

const STATUS_COLORS = {
  todo: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
};

function TaskCard({ task, onStatusChange, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <h4 className="font-semibold text-gray-900">{task.title}</h4>
        <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>
      {task.description && (
        <p className="text-sm text-gray-600">{task.description}</p>
      )}
      {task.due_date && (
        <p className="text-sm text-gray-400">
          Due: {new Date(task.due_date).toLocaleDateString()}
        </p>
      )}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1"
          aria-label="Change status"
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <button
          onClick={() => onDelete(task.id)}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default TaskCard;
