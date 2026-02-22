import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProjectList from './pages/ProjectList';
import CreateProject from './pages/CreateProject';
import ProjectDetail from './pages/ProjectDetail';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<ProjectList />} />
          <Route path="/projects/new" element={<CreateProject />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
