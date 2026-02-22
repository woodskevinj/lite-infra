import { useState, useEffect } from 'react';
import { fetchProjects } from '../api';
import ProjectCard from '../components/ProjectCard';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading projects...</p>;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
        Could not load projects. {error}
      </div>
    );
  }

  if (projects.length === 0) {
    return <p className="text-gray-500">No projects yet. Create one to get started.</p>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Projects</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

export default ProjectList;
