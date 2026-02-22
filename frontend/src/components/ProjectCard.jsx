import { Link } from 'react-router-dom';

function ProjectCard({ project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
    >
      <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
      {project.description && (
        <p className="mt-2 text-gray-600">{project.description}</p>
      )}
      <p className="mt-3 text-sm text-gray-400">
        Created {new Date(project.created_at).toLocaleDateString()}
      </p>
    </Link>
  );
}

export default ProjectCard;
