const db = require('../db');

// GET /api/employees (List, Search, Filter, Sort, Pagination)
const getEmployees = async (req, res) => {
  try {
    const {
      search = '',
      department = '',
      status = '',
      sortBy = 'employee_id',
      sortOrder = 'ASC',
      page = 1,
      limit = 10
    } = req.query;

    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 10;
    const offset = (parsedPage - 1) * parsedLimit;

    // Sanitize sorting to avoid SQL Injection
    const allowedSortFields = ['id', 'employee_id', 'name', 'email', 'department', 'designation', 'status'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'employee_id';
    const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

    // Build the query and parameters
    let queryConditions = [];
    let queryParams = [];

    if (search.trim()) {
      queryConditions.push('(name LIKE ? OR email LIKE ? OR employee_id LIKE ? OR mobile LIKE ?)');
      const searchWildcard = `%${search.trim()}%`;
      queryParams.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    }

    if (department.trim()) {
      queryConditions.push('department = ?');
      queryParams.push(department.trim());
    }

    if (status.trim()) {
      queryConditions.push('status = ?');
      queryParams.push(status.trim());
    }

    const whereClause = queryConditions.length > 0 ? `WHERE ${queryConditions.join(' AND ')}` : '';

    // 1. Get total count for pagination metadata
    const countSql = `SELECT COUNT(*) as count FROM employees ${whereClause}`;
    const countResult = await db.queryOne(countSql, queryParams);
    const totalItems = countResult ? countResult.count : 0;
    const totalPages = Math.ceil(totalItems / parsedLimit);

    // 2. Get paginated, sorted, and filtered rows
    const selectSql = `
      SELECT * FROM employees 
      ${whereClause} 
      ORDER BY ${safeSortBy} ${safeSortOrder} 
      LIMIT ? OFFSET ?
    `;
    
    // Add limit and offset to query parameters
    const rows = await db.query(selectSql, [...queryParams, parsedLimit, offset]);

    res.json({
      employees: rows,
      pagination: {
        totalItems,
        totalPages,
        currentPage: parsedPage,
        limit: parsedLimit
      }
    });
  } catch (err) {
    console.error('Error fetching employees:', err.message);
    res.status(500).json({ error: 'Internal server error while fetching employees.' });
  }
};

// GET /api/employees/:id (View Employee Details)
const getEmployeeById = async (req, res) => {
  const { id } = req.params;
  try {
    const employee = await db.queryOne('SELECT * FROM employees WHERE id = ?', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    res.json(employee);
  } catch (err) {
    console.error('Error fetching employee:', err.message);
    res.status(500).json({ error: 'Internal server error while fetching employee details.' });
  }
};

// POST /api/employees (Add Employee)
const createEmployee = async (req, res) => {
  const { employee_id, name, email, mobile, department, designation, status } = req.body;

  // Validation
  if (!employee_id || !name || !email || !mobile || !department || !designation) {
    return res.status(400).json({ error: 'All fields except status are required.' });
  }

  try {
    // Check for duplicate employee_id
    const dupId = await db.queryOne('SELECT id FROM employees WHERE employee_id = ?', [employee_id]);
    if (dupId) {
      return res.status(400).json({ error: 'Employee ID is already in use.' });
    }

    // Check for duplicate email
    const dupEmail = await db.queryOne('SELECT id FROM employees WHERE email = ?', [email]);
    if (dupEmail) {
      return res.status(400).json({ error: 'Email address is already in use.' });
    }

    const employeeStatus = status || 'Active';
    if (!['Active', 'Inactive'].includes(employeeStatus)) {
      return res.status(400).json({ error: 'Status must be Active or Inactive.' });
    }

    const sql = `
      INSERT INTO employees (employee_id, name, email, mobile, department, designation, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await db.run(sql, [
      employee_id.trim(),
      name.trim(),
      email.trim(),
      mobile.trim(),
      department.trim(),
      designation.trim(),
      employeeStatus
    ]);

    res.status(201).json({
      message: 'Employee added successfully',
      id: result.lastID,
      employee: {
        id: result.lastID,
        employee_id,
        name,
        email,
        mobile,
        department,
        designation,
        status: employeeStatus
      }
    });
  } catch (err) {
    console.error('Error creating employee:', err.message);
    res.status(500).json({ error: 'Internal server error while adding employee.' });
  }
};

// PUT /api/employees/:id (Edit Employee)
const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, department, designation, status } = req.body;

  if (!name || !email || !mobile || !department || !designation || !status) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Verify employee exists
    const employee = await db.queryOne('SELECT * FROM employees WHERE id = ?', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Check if email is used by another employee
    const dupEmail = await db.queryOne('SELECT id FROM employees WHERE email = ? AND id != ?', [email, id]);
    if (dupEmail) {
      return res.status(400).json({ error: 'Email address is already in use by another employee.' });
    }

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Active or Inactive.' });
    }

    const sql = `
      UPDATE employees 
      SET name = ?, email = ?, mobile = ?, department = ?, designation = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await db.run(sql, [name.trim(), email.trim(), mobile.trim(), department.trim(), designation.trim(), status, id]);

    res.json({
      message: 'Employee updated successfully',
      employee: {
        id,
        employee_id: employee.employee_id,
        name,
        email,
        mobile,
        department,
        designation,
        status
      }
    });
  } catch (err) {
    console.error('Error updating employee:', err.message);
    res.status(500).json({ error: 'Internal server error while updating employee.' });
  }
};

// DELETE /api/employees/:id (Delete Employee)
const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    // Verify employee exists
    const employee = await db.queryOne('SELECT * FROM employees WHERE id = ?', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Delete employee - attendance records cascade delete automatically
    await db.run('DELETE FROM employees WHERE id = ?', [id]);

    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Error deleting employee:', err.message);
    res.status(500).json({ error: 'Internal server error while deleting employee.' });
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
