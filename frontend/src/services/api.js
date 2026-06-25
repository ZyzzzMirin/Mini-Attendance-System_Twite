const API_BASE_URL = 'http://localhost:5000/api';

// Helper to make API requests
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // If the response is a file download (CSV or Excel)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv') || contentType.includes('spreadsheetml')) {
    return response.blob();
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
};

export const api = {
  // Auth APIs
  auth: {
    login: (username, password) => 
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      }),
    register: (username, password, role) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, role })
      })
  },

  // Employee APIs
  employees: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/employees?${query}`);
    },
    getById: (id) => request(`/employees/${id}`),
    create: (data) => 
      request('/employees', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id, data) => 
      request(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id) => 
      request(`/employees/${id}`, {
        method: 'DELETE'
      })
  },

  // Attendance APIs
  attendance: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/attendance?${query}`);
    },
    getSummary: (date) => {
      const query = date ? `?date=${date}` : '';
      return request(`/attendance/summary${query}`);
    },
    getEmployeeHistory: (employeeId, params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/attendance/employee/${employeeId}?${query}`);
    },
    mark: (data) => 
      request('/attendance/mark', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    exportCsv: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const blob = await request(`/attendance/export?${query}`);
      
      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
    exportExcel: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const blob = await request(`/attendance/export-excel?${query}`);

      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
  },

  // Dashboard APIs
  dashboard: {
    getStats: (date) => {
      const query = date ? `?date=${date}` : '';
      return request(`/dashboard/stats${query}`);
    }
  }
};
