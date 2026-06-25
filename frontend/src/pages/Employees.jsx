import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import {
  Plus, Search, Edit2, Trash2, X, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Eye, Users, RefreshCw
} from 'lucide-react';

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Design', 'Sales', 'Legal', 'Support'];
const DESIGNATIONS = ['Manager', 'Senior Engineer', 'Engineer', 'Analyst', 'Executive', 'Director', 'Intern', 'Lead', 'Specialist'];

// ---- Modal Component (Add / Edit) ----
const EmployeeModal = ({ mode, employee, onClose, onSave }) => {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    employee_id: '',
    name: '',
    email: '',
    mobile: '',
    department: DEPARTMENTS[0],
    designation: DESIGNATIONS[0],
    status: 'Active',
    ...employee,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.employee_id.trim()) errs.employee_id = 'Employee ID is required';
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email address';
    if (!form.mobile.trim()) errs.mobile = 'Mobile number is required';
    if (!form.department) errs.department = 'Department is required';
    if (!form.designation) errs.designation = 'Designation is required';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await onSave(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Employee' : 'Add New Employee'}</h3>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="employee_id">Employee ID *</label>
                <input
                  id="employee_id" name="employee_id" className="form-control"
                  value={form.employee_id} onChange={handleChange}
                  placeholder="e.g., EMP001" disabled={isEdit}
                />
                {errors.employee_id && <span style={{ color: 'var(--danger-color)', fontSize: '0.8rem' }}>{errors.employee_id}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  id="name" name="name" className="form-control"
                  value={form.name} onChange={handleChange}
                  placeholder="Employee full name"
                />
                {errors.name && <span style={{ color: 'var(--danger-color)', fontSize: '0.8rem' }}>{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  id="email" name="email" type="email" className="form-control"
                  value={form.email} onChange={handleChange}
                  placeholder="employee@company.com"
                />
                {errors.email && <span style={{ color: 'var(--danger-color)', fontSize: '0.8rem' }}>{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="mobile">Mobile Number *</label>
                <input
                  id="mobile" name="mobile" className="form-control"
                  value={form.mobile} onChange={handleChange}
                  placeholder="+1 234 567 8900"
                />
                {errors.mobile && <span style={{ color: 'var(--danger-color)', fontSize: '0.8rem' }}>{errors.mobile}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="department">Department *</label>
                <select id="department" name="department" className="form-control" value={form.department} onChange={handleChange}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="designation">Designation *</label>
                <select id="designation" name="designation" className="form-control" value={form.designation} onChange={handleChange}>
                  {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" className="form-control" value={form.status} onChange={handleChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : (isEdit ? 'Update Employee' : 'Add Employee')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---- View Details Modal ----
const ViewModal = ({ employee, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Employee Details</h3>
        <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
      </div>
      <div className="modal-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {[
            ['Employee ID', employee.employee_id],
            ['Full Name', employee.name],
            ['Email Address', employee.email],
            ['Mobile Number', employee.mobile],
            ['Department', employee.department],
            ['Designation', employee.designation],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>{label}</div>
              <div style={{ fontWeight: 500 }}>{val}</div>
            </div>
          ))}
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Status</div>
            <span className={`badge badge-${employee.status.toLowerCase()}`}>{employee.status}</span>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Added On</div>
            <div style={{ fontWeight: 500 }}>{new Date(employee.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  </div>
);

// ---- Delete Confirm Modal ----
const DeleteModal = ({ employee, onClose, onConfirm, deleting }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Delete Employee</h3>
        <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
      </div>
      <div className="modal-body">
        <p>Are you sure you want to delete <strong>{employee.name}</strong> ({employee.employee_id})?</p>
        <p style={{ marginTop: '8px', color: 'var(--danger-color)', fontSize: '0.85rem' }}>
          This will also permanently delete all their attendance records.
        </p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete Employee'}
        </button>
      </div>
    </div>
  </div>
);

// ---- Toast Notification ----
const Toast = ({ message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`toast-notification toast-${type}`}>
      <span>{message}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
        <X size={16} />
      </button>
    </div>
  );
};

// ---- Sort Icon Helper ----
const SortIcon = ({ field, currentSort, currentOrder }) => {
  if (currentSort !== field) return <ChevronUp size={14} style={{ opacity: 0.3 }} />;
  return currentOrder === 'ASC'
    ? <ChevronUp size={14} style={{ color: 'var(--primary-color)' }} />
    : <ChevronDown size={14} style={{ color: 'var(--primary-color)' }} />;
};

// ---- Main Employee Management Page ----
const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1, currentPage: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('employee_id');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { type: 'add'|'edit'|'view'|'delete', employee? }
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const dismissToast = () => setToast(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.employees.getAll({
        search, department: deptFilter, status: statusFilter,
        sortBy, sortOrder, page, limit: 10
      });
      setEmployees(response.employees || []);
      setPagination(response.pagination || {});
    } catch (err) {
      showToast(err.message || 'Failed to load employees.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, statusFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    const debounce = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(debounce);
  }, [fetchEmployees]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC');
    else { setSortBy(field); setSortOrder('ASC'); }
    setPage(1);
  };

  const handleSave = async (formData) => {
    try {
      if (modal.type === 'add') {
        await api.employees.create(formData);
        showToast('Employee added successfully!');
      } else {
        await api.employees.update(modal.employee.id, formData);
        showToast('Employee updated successfully!');
      }
      setModal(null);
      fetchEmployees();
    } catch (err) {
      showToast(err.message || 'Failed to save employee.', 'error');
      throw err;
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.employees.delete(modal.employee.id);
      showToast('Employee deleted successfully!');
      setModal(null);
      fetchEmployees();
    } catch (err) {
      showToast(err.message || 'Failed to delete employee.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="form-control"
              placeholder="Search employees..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <select
            className="form-control"
            value={deptFilter}
            onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
            style={{ minWidth: '160px' }}
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            className="form-control"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ minWidth: '130px' }}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button className="btn btn-secondary btn-icon" onClick={fetchEmployees} title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'add' })}>
          <Plus size={16} />
          Add Employee
        </button>
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="card-header">
          <h2>
            <Users size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Employees
            <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              ({pagination.totalItems || 0} total)
            </span>
          </h2>
        </div>

        <div className="table-responsive">
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>
              <RefreshCw size={28} style={{ marginBottom: '12px', color: 'var(--primary-color)' }} />
              <p>Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>
              <Users size={48} style={{ marginBottom: '16px', color: 'var(--border-color)' }} />
              <p>No employees found. Add your first employee!</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  {[
                    { field: 'employee_id', label: 'Employee ID' },
                    { field: 'name', label: 'Name' },
                    { field: 'department', label: 'Department' },
                    { field: 'designation', label: 'Designation' },
                    { field: 'status', label: 'Status' },
                  ].map(({ field, label }) => (
                    <th
                      key={field}
                      className="sortable"
                      onClick={() => handleSort(field)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {label}
                        <SortIcon field={field} currentSort={sortBy} currentOrder={sortOrder} />
                      </span>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-color)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '4px' }}>
                        {emp.employee_id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{emp.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                    </td>
                    <td>{emp.department}</td>
                    <td>{emp.designation}</td>
                    <td>
                      <span className={`badge badge-${emp.status.toLowerCase()}`}>{emp.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary btn-icon"
                          onClick={() => setModal({ type: 'view', employee: emp })}
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="btn btn-secondary btn-icon"
                          onClick={() => setModal({ type: 'edit', employee: emp })}
                          title="Edit Employee"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="btn btn-danger btn-icon"
                          onClick={() => setModal({ type: 'delete', employee: emp })}
                          title="Delete Employee"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
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
              <button
                className="btn btn-secondary btn-icon"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.currentPage <= 1}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - pagination.currentPage) <= 2)
                .map(p => (
                  <button
                    key={p}
                    className={`btn ${p === pagination.currentPage ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPage(p)}
                    style={{ minWidth: '36px', padding: '8px' }}
                  >
                    {p}
                  </button>
                ))}
              <button
                className="btn btn-secondary btn-icon"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.currentPage >= pagination.totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <EmployeeModal
          mode={modal.type}
          employee={modal.employee}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {modal?.type === 'view' && (
        <ViewModal employee={modal.employee} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal
          employee={modal.employee}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
};

export default Employees;
