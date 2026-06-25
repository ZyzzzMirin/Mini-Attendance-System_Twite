import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import {
  LogIn, LogOut, Search, Download, RefreshCw,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  CalendarCheck, X, CheckCircle, AlertCircle, Clock
} from 'lucide-react';

// ---- Live Clock ----
const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = n => String(n).padStart(2, '0');
  const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return { timeStr, dateStr, dateISO: time.toISOString().slice(0, 10) };
};

// ---- Toast ----
const Toast = ({ message, type, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className={`toast-notification toast-${type}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span>{message}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={14} /></button>
    </div>
  );
};

// ---- Sort Icon ----
const SortIcon = ({ field, currentSort, currentOrder }) => {
  if (currentSort !== field) return <ChevronUp size={14} style={{ opacity: 0.3 }} />;
  return currentOrder === 'ASC'
    ? <ChevronUp size={14} style={{ color: 'var(--primary-color)' }} />
    : <ChevronDown size={14} style={{ color: 'var(--primary-color)' }} />;
};

// ---- Employee History Modal ----
const HistoryModal = ({ employeeId, employeeName, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.attendance.getEmployeeHistory(employeeId);
        setHistory(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [employeeId]);

  const presentDays = history.filter(h => h.status === 'Present').length;
  const lateDays = history.filter(h => h.status === 'Late').length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Attendance History</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>{employeeName} ({employeeId})</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Loading history...</div>
          ) : (
            <>
              {/* Summary row */}
              <div style={{ display: 'flex', gap: '16px', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-app)' }}>
                {[
                  { label: 'Total Records', val: history.length, color: 'var(--primary-color)' },
                  { label: 'Present', val: presentDays, color: 'var(--success-color)' },
                  { label: 'Late', val: lateDays, color: 'var(--warning-color)' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{val}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                  </div>
                ))}
              </div>
              {history.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>No attendance records found.</div>
              ) : (
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(h => (
                        <tr key={h.id}>
                          <td>{h.date}</td>
                          <td>{h.check_in || '—'}</td>
                          <td>{h.check_out || '—'}</td>
                          <td><span className={`badge badge-${h.status.toLowerCase()}`}>{h.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ---- Manual Attendance Entry Modal ----
const ManualEntryModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ employee_id: '', date: new Date().toISOString().slice(0, 10), check_in: '', check_out: '', status: 'Present' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.employee_id.trim()) { setError('Employee ID is required.'); return; }
    if (!form.check_in) { setError('Check-in time is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manual Attendance Entry</h3>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: 'var(--danger-color)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}
            <div className="form-group">
              <label>Employee ID *</label>
              <input name="employee_id" className="form-control" value={form.employee_id} onChange={handleChange} placeholder="e.g., EMP001" />
            </div>
            <div className="form-group">
              <label>Date *</label>
              <input name="date" type="date" className="form-control" value={form.date} onChange={handleChange} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Check-In Time *</label>
                <input name="check_in" type="time" className="form-control" value={form.check_in} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Check-Out Time</label>
                <input name="check_out" type="time" className="form-control" value={form.check_out} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" className="form-control" value={form.status} onChange={handleChange}>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Record'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---- Main Attendance Page ----
const Attendance = () => {
  const clock = LiveClock();
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [consoleLoading, setConsoleLoading] = useState(false);
  const [consoleResult, setConsoleResult] = useState(null); // { type: 'success'|'error', message }
  const [summary, setSummary] = useState(null);

  // Table state
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1, currentPage: 1, limit: 10 });
  const [tableLoading, setTableLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.attendance.getSummary(clock.dateISO);
      setSummary(data);
    } catch (e) { /* silent */ }
  }, [clock.dateISO]);

  const fetchRecords = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await api.attendance.getAll({ search, status: statusFilter, startDate, endDate, sortBy, sortOrder, page, limit: 10 });
      setRecords(response.records || []);
      setPagination(response.pagination || {});
    } catch (err) {
      showToast(err.message || 'Failed to load records.', 'error');
    } finally {
      setTableLoading(false);
    }
  }, [search, statusFilter, startDate, endDate, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 60000); // refresh summary every minute
    return () => clearInterval(interval);
  }, [fetchSummary]);

  useEffect(() => {
    const d = setTimeout(fetchRecords, 300);
    return () => clearTimeout(d);
  }, [fetchRecords]);

  const handleCheckIn = async () => {
    if (!employeeIdInput.trim()) {
      setConsoleResult({ type: 'error', message: 'Please enter an Employee ID.' });
      return;
    }
    setConsoleLoading(true);
    setConsoleResult(null);
    try {
      const res = await api.attendance.mark({ employee_id: employeeIdInput.trim(), type: 'checkin' });
      setConsoleResult({ type: 'success', message: `✓ ${res.record?.status || 'Present'} — Checked in at ${res.record?.check_in || 'now'}` });
      setEmployeeIdInput('');
      fetchSummary();
      fetchRecords();
    } catch (err) {
      setConsoleResult({ type: 'error', message: err.message });
    } finally {
      setConsoleLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employeeIdInput.trim()) {
      setConsoleResult({ type: 'error', message: 'Please enter an Employee ID.' });
      return;
    }
    setConsoleLoading(true);
    setConsoleResult(null);
    try {
      const res = await api.attendance.mark({ employee_id: employeeIdInput.trim(), type: 'checkout' });
      setConsoleResult({ type: 'success', message: `✓ Checked out at ${res.record?.check_out || 'now'}` });
      setEmployeeIdInput('');
      fetchSummary();
      fetchRecords();
    } catch (err) {
      setConsoleResult({ type: 'error', message: err.message });
    } finally {
      setConsoleLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC');
    else { setSortBy(field); setSortOrder('ASC'); }
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.attendance.exportCsv({ search, status: statusFilter, startDate, endDate });
      showToast('CSV report exported successfully!');
    } catch (err) {
      showToast('Failed to export CSV report.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await api.attendance.exportExcel({ search, status: statusFilter, startDate, endDate });
      showToast('Excel report exported successfully!');
    } catch (err) {
      showToast('Failed to export Excel report.', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleManualSave = async (formData) => {
    await api.attendance.mark(formData);
    showToast('Attendance record saved!');
    setModal(null);
    fetchRecords();
    fetchSummary();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* Top Row: Console + Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Check-In/Out Console */}
        <div className="console-card">
          <div className="console-clock">{clock.timeStr}</div>
          <div className="console-date">{clock.dateStr}</div>
          <div className="console-form">
            <input
              className="console-input"
              placeholder="Enter Employee ID"
              value={employeeIdInput}
              onChange={e => { setEmployeeIdInput(e.target.value); setConsoleResult(null); }}
              onKeyDown={e => e.key === 'Enter' && handleCheckIn()}
              disabled={consoleLoading}
            />
            <div className="console-actions" style={{ justifyContent: 'center' }}>
              <button
                className="btn"
                style={{ background: '#10b981', color: 'white', flex: 1 }}
                onClick={handleCheckIn}
                disabled={consoleLoading}
              >
                <LogIn size={16} />
                Check In
              </button>
              <button
                className="btn"
                style={{ background: '#f59e0b', color: 'white', flex: 1 }}
                onClick={handleCheckOut}
                disabled={consoleLoading}
              >
                <LogOut size={16} />
                Check Out
              </button>
            </div>
          </div>
          {consoleResult && (
            <div style={{
              padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontWeight: 500,
              background: consoleResult.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: consoleResult.type === 'success' ? '#6ee7b7' : '#fca5a5',
              border: `1px solid ${consoleResult.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              width: '100%', textAlign: 'center'
            }}>
              {consoleResult.message}
            </div>
          )}
        </div>

        {/* Today's Summary */}
        <div className="card">
          <div className="card-header">
            <h2>Today's Summary</h2>
            <CalendarCheck size={18} style={{ color: 'var(--text-light)' }} />
          </div>
          <div className="card-body">
            {summary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Active Employees', val: summary.totalActiveEmployees, color: 'var(--primary-color)' },
                  { label: 'Present / Late', val: `${summary.present} / ${summary.late}`, color: 'var(--success-color)' },
                  { label: 'Absent', val: summary.absent, color: 'var(--danger-color)' },
                  { label: 'Total Marked', val: summary.totalMarked, color: 'var(--warning-color)' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color }}>{val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>
                <Clock size={32} style={{ marginBottom: '8px', color: 'var(--border-color)' }} />
                <p>Loading today's summary...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="card">
        <div className="card-header">
          <h2>
            Attendance Records
            <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              ({pagination.totalItems || 0} total)
            </span>
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => setModal({ type: 'manual' })}>
              <Clock size={15} /> Manual Entry
            </button>
            <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
              <Download size={15} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExportExcel}
              disabled={exportingExcel}
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', borderColor: 'transparent' }}
            >
              <Download size={15} />
              {exportingExcel ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input-wrapper" style={{ flexGrow: 1, minWidth: '200px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text" className="form-control" placeholder="Search by name or department..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <select className="form-control" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ minWidth: '130px' }}>
            <option value="">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
          </select>
          <input type="date" className="form-control" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} title="Start Date" style={{ maxWidth: '160px' }} />
          <input type="date" className="form-control" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} title="End Date" style={{ maxWidth: '160px' }} />
          <button className="btn btn-secondary btn-icon" onClick={fetchRecords} title="Refresh"><RefreshCw size={16} /></button>
        </div>

        <div className="table-responsive">
          {tableLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>
              <RefreshCw size={28} style={{ marginBottom: '12px', color: 'var(--primary-color)' }} />
              <p>Loading attendance records...</p>
            </div>
          ) : records.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>
              <CalendarCheck size={48} style={{ marginBottom: '16px', color: 'var(--border-color)' }} />
              <p>No attendance records found for the current filters.</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  {[
                    { field: 'date', label: 'Date' },
                    { field: 'employee_id', label: 'Employee' },
                    { field: 'department', label: 'Department' },
                    { field: 'check_in', label: 'Check-In' },
                    { field: 'check_out', label: 'Check-Out' },
                    { field: 'status', label: 'Status' },
                  ].map(({ field, label }) => (
                    <th key={field} className="sortable" onClick={() => handleSort(field)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {label} <SortIcon field={field} currentSort={sortBy} currentOrder={sortOrder} />
                      </span>
                    </th>
                  ))}
                  <th>History</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.date}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.employee_id}</div>
                    </td>
                    <td>{r.department}</td>
                    <td>{r.check_in || '—'}</td>
                    <td>{r.check_out || '—'}</td>
                    <td><span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span></td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                        onClick={() => setModal({ type: 'history', employeeId: r.employee_id, employeeName: r.name })}
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination-container">
            <span className="pagination-info">
              Showing {((pagination.currentPage - 1) * pagination.limit) + 1}–
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)} of {pagination.totalItems}
            </span>
            <div className="pagination-buttons">
              <button className="btn btn-secondary btn-icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.currentPage <= 1}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - pagination.currentPage) <= 2)
                .map(p => (
                  <button key={p} className={`btn ${p === pagination.currentPage ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)} style={{ minWidth: '36px', padding: '8px' }}>
                    {p}
                  </button>
                ))}
              <button className="btn btn-secondary btn-icon" onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={pagination.currentPage >= pagination.totalPages}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'history' && (
        <HistoryModal employeeId={modal.employeeId} employeeName={modal.employeeName} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'manual' && (
        <ManualEntryModal onClose={() => setModal(null)} onSave={handleManualSave} />
      )}
    </div>
  );
};

export default Attendance;
