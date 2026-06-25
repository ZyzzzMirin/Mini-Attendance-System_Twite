import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, UserCheck, UserMinus, Clock, Building, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.dashboard.getStats();
        setStats(response);
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
        setError('Failed to load dashboard metrics. Ensure backend server is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [refreshKey]);

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary-color)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card animate-fade-in" style={{ padding: '24px', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}>
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button 
          className="btn btn-secondary" 
          onClick={() => setRefreshKey(prev => prev + 1)}
          style={{ marginTop: '16px', alignSelf: 'flex-start' }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { stats: s, departmentDistribution = [], recentLogs = [] } = stats || {};

  // Find max count in department distribution to scale progress bars
  const maxDeptCount = departmentDistribution.reduce((max, d) => Math.max(max, d.count), 1);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Metrics Row */}
      <div className="dashboard-grid">
        <div className="stat-card stat-total">
          <div className="stat-info">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{s?.totalEmployees || 0}</span>
          </div>
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card stat-active">
          <div className="stat-info">
            <span className="stat-label">Active Employees</span>
            <span className="stat-value">{s?.activeEmployees || 0}</span>
          </div>
          <div className="stat-icon-wrapper">
            <UserCheck size={24} />
          </div>
        </div>

        <div className="stat-card stat-present">
          <div className="stat-info">
            <span className="stat-label">Present Today</span>
            <span className="stat-value">{s?.presentToday || 0}</span>
          </div>
          <div className="stat-icon-wrapper">
            <UserCheck size={24} />
          </div>
        </div>

        <div className="stat-card stat-absent">
          <div className="stat-info">
            <span className="stat-label">Absent Today</span>
            <span className="stat-value">{s?.absentToday || 0}</span>
          </div>
          <div className="stat-icon-wrapper">
            <UserMinus size={24} />
          </div>
        </div>
      </div>

      {/* Double Column Info */}
      <div className="dashboard-details-grid">
        {/* Recent logs */}
        <div className="card">
          <div className="card-header">
            <h2>Today's Recent Activity</h2>
            <button 
              className="btn btn-secondary btn-icon" 
              onClick={() => setRefreshKey(prev => prev + 1)}
              title="Refresh Stats"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentLogs.length === 0 ? (
              <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-light)', textAlign: 'center' }}>
                <Clock size={40} style={{ margin: '0 auto 12px auto', color: 'var(--border-color)' }} />
                <p>No check-in activity recorded today yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{log.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.employee_id}</div>
                        </td>
                        <td>{log.department}</td>
                        <td>{log.check_in || '-'}</td>
                        <td>{log.check_out || '-'}</td>
                        <td>
                          <span className={`badge badge-${log.status.toLowerCase()}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Department Distribution */}
        <div className="card">
          <div className="card-header">
            <h2>Departments</h2>
            <Building size={18} style={{ color: 'var(--text-light)' }} />
          </div>
          <div className="card-body">
            {departmentDistribution.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>No employee departments found.</p>
            ) : (
              <div className="dept-list">
                {departmentDistribution.map((dept) => {
                  const percentage = Math.round((dept.count / maxDeptCount) * 100);
                  return (
                    <div className="dept-item" key={dept.department}>
                      <div className="dept-info">
                        <span className="dept-name">{dept.department}</span>
                        <span className="dept-count">{dept.count} {dept.count === 1 ? 'employee' : 'employees'}</span>
                      </div>
                      <div className="dept-bar-bg">
                        <div 
                          className="dept-bar-fill" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
