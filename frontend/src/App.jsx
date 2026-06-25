import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';

const PAGE_TITLES = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your attendance system' },
  employees: { title: 'Employee Management', subtitle: 'Manage your team members' },
  attendance: { title: 'Attendance Tracking', subtitle: 'Monitor daily check-ins and records' },
};

const App = () => {
  const { isAuthenticated } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':  return <Dashboard />;
      case 'employees':  return <Employees />;
      case 'attendance': return <Attendance />;
      default:           return <Dashboard />;
    }
  };

  const { title, subtitle } = PAGE_TITLES[activePage] || PAGE_TITLES.dashboard;

  return (
    <div className="app-container">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <main className="main-content">
        {/* Page Header */}
        <div className="content-header animate-fade-in">
          <div className="header-title-container">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="header-actions">
            <span style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              background: 'var(--bg-card)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
              fontWeight: 500
            }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Page Content */}
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
