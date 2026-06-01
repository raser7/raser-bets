import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import ChipControlModule from './pages/ChipControlModule';
import ThemeToggle from './components/ThemeToggle';
import { getAdminBasePath, getChipControlPath } from './lib/adminAuth';

function App() {
  const adminBasePath = getAdminBasePath();
  const chipControlPath = getChipControlPath();

  return (
    <BrowserRouter>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path={adminBasePath} element={<AdminPanel />} />
        <Route path={chipControlPath} element={<ChipControlModule />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
