import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProject, fetchTasks, createTask, updateTaskStatus, deleteTask } from '../api';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';

function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([fetchProject(id), fetchTasks(id)])
      .then(([proj, taskList]) => {
        setProject(proj);
        setTasks(taskList);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCreateTask = async (taskData) => {
    try {
      const newTask = await createTask(id, taskData);
      setTasks((prev) => [newTask, ...prev]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      const updated = await updateTaskStatus(taskId, status);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  if (error && !project) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
        Could not load project. {error}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
      {project.description && (
        <p className="mt-2 text-gray-600">{project.description}</p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mt-4">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-6">
        <TaskForm onSubmit={handleCreateTask} />

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tasks ({tasks.length})
          </h3>
          {tasks.length === 0 ? (
            <p className="text-gray-500">No tasks yet. Add one above.</p>
          ) : (
            <div className="grid gap-4">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectDetail;
