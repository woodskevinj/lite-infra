import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold hover:text-gray-300">
          Task Tracker
        </Link>
        <div className="flex gap-4">
          <Link to="/" className="hover:text-gray-300">Projects</Link>
          <Link to="/projects/new" className="hover:text-gray-300">New Project</Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
