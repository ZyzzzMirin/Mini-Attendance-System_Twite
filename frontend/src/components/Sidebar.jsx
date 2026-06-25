import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  LogOut,
  CheckSquare
} from 'lucide-react';

const Sidebar = ({ activePage, onNavigate }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  ];

  return (
    <aside className="sidebar animate-slide-left">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <CheckSquare size={20} />
        </div>
        <span className="sidebar-logo-text">AttendTrack</span>
      </div>

      {/* Navigation Menu */}
      <ul className="sidebar-menu">
        {navItems.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              className={`sidebar-item ${activePage === id ? 'active' : ''}`}
              onClick={() => onNavigate(id)}
              style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.username?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.username || 'Admin'}</span>
            <span className="sidebar-user-role">{user?.role || 'Administrator'}</span>
          </div>
        </div>
        <button
          className="logout-btn"
          onClick={logout}
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
