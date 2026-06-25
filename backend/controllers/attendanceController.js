const db = require('../db');
const ExcelJS = require('exceljs');

// GET /api/attendance (List, Search, Filter, Sort, Pagination)
const getAttendanceRecords = async (req, res) => {
  try {
    const {
      search = '',
      status = '',
      startDate = '',
      endDate = '',
      sortBy = 'date',
      sortOrder = 'DESC',
      page = 1,
      limit = 10
    } = req.query;

    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 10;
    const offset = (parsedPage - 1) * parsedLimit;

    // Sanitize sort field
    const allowedSortFields = ['date', 'employee_id', 'status', 'check_in', 'check_out', 'name', 'department'];
    let safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date';
    const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Build query conditions
    let queryConditions = [];
    let queryParams = [];

    if (search.trim()) {
      queryConditions.push('(e.name LIKE ? OR a.employee_id LIKE ? OR e.department LIKE ?)');
      const wildcard = `%${search.trim()}%`;
      queryParams.push(wildcard, wildcard, wildcard);
    }

    if (status.trim()) {
      queryConditions.push('a.status = ?');
      queryParams.push(status.trim());
    }

    if (startDate.trim()) {
      queryConditions.push('a.date >= ?');
      queryParams.push(startDate.trim());
    }

    if (endDate.trim()) {
      queryConditions.push('a.date <= ?');
      queryParams.push(endDate.trim());
    }

    const whereClause = queryConditions.length > 0 ? `WHERE ${queryConditions.join(' AND ')}` : '';

    // If sorting by employee name or department, we resolve conflicts
    if (safeSortBy === 'name') safeSortBy = 'e.name';
    if (safeSortBy === 'department') safeSortBy = 'e.department';
    if (safeSortBy === 'employee_id') safeSortBy = 'a.employee_id';
    if (safeSortBy === 'status') safeSortBy = 'a.status';
    if (safeSortBy === 'date') safeSortBy = 'a.date';

    // 1. Get count
    const countSql = `
      SELECT COUNT(*) as count 
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      ${whereClause}
    `;
    const countResult = await db.queryOne(countSql, queryParams);
    const totalItems = countResult ? countResult.count : 0;
    const totalPages = Math.ceil(totalItems / parsedLimit);

    // 2. Get paginated records
    const selectSql = `
      SELECT a.*, e.name, e.department, e.designation, e.email
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;

    const records = await db.query(selectSql, [...queryParams, parsedLimit, offset]);

    res.json({
      records,
      pagination: {
        totalItems,
        totalPages,
        currentPage: parsedPage,
        limit: parsedLimit
      }
    });
  } catch (err) {
    console.error('Error fetching attendance records:', err.message);
    res.status(500).json({ error: 'Internal server error while fetching attendance.' });
  }
};

// GET /api/attendance/employee/:employee_id (Individual History)
const getEmployeeAttendanceHistory = async (req, res) => {
  const { employee_id } = req.params;
  const { startDate, endDate } = req.query;

  try {
    let sql = `SELECT * FROM attendance WHERE employee_id = ?`;
    let params = [employee_id];

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY date DESC';
    const history = await db.query(sql, params);
    res.json(history);
  } catch (err) {
    console.error('Error fetching employee attendance history:', err.message);
    res.status(500).json({ error: 'Internal server error fetching employee history.' });
  }
};

// POST /api/attendance/mark (Check-In or Check-Out for Today, or manual entry)
const markAttendance = async (req, res) => {
  const { employee_id, date, check_in, check_out, status, type } = req.body;

  if (!employee_id) {
    return res.status(400).json({ error: 'Employee ID is required.' });
  }

  try {
    // 1. Verify employee exists and is active
    const employee = await db.queryOne('SELECT * FROM employees WHERE employee_id = ?', [employee_id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    if (employee.status !== 'Active') {
      return res.status(400).json({ error: 'Cannot mark attendance for an Inactive employee.' });
    }

    // Determine date and time
    const now = new Date();
    const formattedDate = date || now.toISOString().slice(0, 10); // YYYY-MM-DD
    const formattedTime = now.toTimeString().slice(0, 8); // HH:MM:SS

    // Check if record already exists for the day
    const existingRecord = await db.queryOne(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employee_id, formattedDate]
    );

    // If explicit type check-out is requested, or it's an update, or a check-in exists and we are marking attendance again
    if (type === 'checkout' || (existingRecord && !check_in && !status)) {
      if (!existingRecord) {
        return res.status(400).json({ error: 'Cannot check out before checking in.' });
      }
      if (existingRecord.check_out) {
        return res.status(400).json({ error: 'Employee has already checked out for today.' });
      }

      const outTime = check_out || formattedTime;
      await db.run(
        'UPDATE attendance SET check_out = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [outTime, existingRecord.id]
      );

      return res.json({
        message: 'Checked out successfully',
        record: { ...existingRecord, check_out: outTime }
      });
    }

    // For Check-in or Manual Admin Override
    if (existingRecord) {
      // Overwrite/Admin edit
      const checkInVal = check_in || existingRecord.check_in;
      const checkOutVal = check_out !== undefined ? check_out : existingRecord.check_out;
      
      // Determine status: if admin provided status, use it. Otherwise, re-evaluate based on check-in time
      let statusVal = status;
      if (!statusVal) {
        statusVal = checkInVal > '09:15:00' ? 'Late' : 'Present';
      }

      await db.run(
        'UPDATE attendance SET check_in = ?, check_out = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [checkInVal, checkOutVal, statusVal, existingRecord.id]
      );

      return res.json({
        message: 'Attendance record updated successfully',
        record: {
          id: existingRecord.id,
          employee_id,
          date: formattedDate,
          check_in: checkInVal,
          check_out: checkOutVal,
          status: statusVal
        }
      });
    } else {
      // New check-in
      const inTime = check_in || formattedTime;
      const outTime = check_out || null;
      
      // Determine status: late if after 9:15 AM
      let statusVal = status;
      if (!statusVal) {
        statusVal = inTime > '09:15:00' ? 'Late' : 'Present';
      }

      const result = await db.run(
        'INSERT INTO attendance (employee_id, date, check_in, check_out, status) VALUES (?, ?, ?, ?, ?)',
        [employee_id, formattedDate, inTime, outTime, statusVal]
      );

      return res.status(201).json({
        message: 'Checked in successfully',
        record: {
          id: result.lastID,
          employee_id,
          date: formattedDate,
          check_in: inTime,
          check_out: outTime,
          status: statusVal
        }
      });
    }
  } catch (err) {
    console.error('Error marking attendance:', err.message);
    res.status(500).json({ error: 'Internal server error while marking attendance.' });
  }
};

// GET /api/attendance/summary (Today's statistics)
const getAttendanceSummary = async (req, res) => {
  const dateVal = req.query.date || new Date().toISOString().slice(0, 10);

  try {
    // 1. Get count of active employees
    const activeResult = await db.queryOne("SELECT COUNT(*) as count FROM employees WHERE status = 'Active'");
    const totalActive = activeResult ? activeResult.count : 0;

    // 2. Present Count for date
    const presentResult = await db.queryOne(
      "SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'Present'",
      [dateVal]
    );
    const presentCount = presentResult ? presentResult.count : 0;

    // 3. Late Count for date
    const lateResult = await db.queryOne(
      "SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'Late'",
      [dateVal]
    );
    const lateCount = lateResult ? lateResult.count : 0;

    // 4. Absent Count (computed as: Active employees who have not marked attendance today + any explicitly marked Absent)
    // Actually, in our schema, "Absent" is when we don't have a record.
    // If they are not in the database for today, they are absent.
    const presentOrLateResult = await db.queryOne(
      "SELECT COUNT(DISTINCT employee_id) as count FROM attendance WHERE date = ? AND status IN ('Present', 'Late')",
      [dateVal]
    );
    const presentOrLateCount = presentOrLateResult ? presentOrLateResult.count : 0;

    // Absent = Active Employees - Checked In (Present or Late)
    const absentCount = Math.max(0, totalActive - presentOrLateCount);

    res.json({
      date: dateVal,
      totalActiveEmployees: totalActive,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      totalMarked: presentOrLateCount
    });
  } catch (err) {
    console.error('Error fetching summary:', err.message);
    res.status(500).json({ error: 'Internal server error fetching summary.' });
  }
};

// GET /api/attendance/export (Download CSV report)
const exportAttendanceRecords = async (req, res) => {
  try {
    const { search = '', status = '', startDate = '', endDate = '' } = req.query;

    let queryConditions = [];
    let queryParams = [];

    if (search.trim()) {
      queryConditions.push('(e.name LIKE ? OR a.employee_id LIKE ? OR e.department LIKE ?)');
      const wildcard = `%${search.trim()}%`;
      queryParams.push(wildcard, wildcard, wildcard);
    }

    if (status.trim()) {
      queryConditions.push('a.status = ?');
      queryParams.push(status.trim());
    }

    if (startDate.trim()) {
      queryConditions.push('a.date >= ?');
      queryParams.push(startDate.trim());
    }

    if (endDate.trim()) {
      queryConditions.push('a.date <= ?');
      queryParams.push(endDate.trim());
    }

    const whereClause = queryConditions.length > 0 ? `WHERE ${queryConditions.join(' AND ')}` : '';

    const sql = `
      SELECT a.date, a.employee_id, e.name, e.department, e.designation, a.check_in, a.check_out, a.status
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      ${whereClause}
      ORDER BY a.date DESC, a.employee_id ASC
    `;

    const records = await db.query(sql, queryParams);

    // Convert records to CSV format
    let csvContent = 'Date,Employee ID,Employee Name,Department,Designation,Check-In Time,Check-Out Time,Status\r\n';
    
    records.forEach((row) => {
      const date = row.date || '';
      const empId = row.employee_id || '';
      // Escape quotes for CSV values
      const name = `"${(row.name || '').replace(/"/g, '""')}"`;
      const dept = `"${(row.department || '').replace(/"/g, '""')}"`;
      const desig = `"${(row.designation || '').replace(/"/g, '""')}"`;
      const checkIn = row.check_in || '-';
      const checkOut = row.check_out || '-';
      const statusVal = row.status || '';

      csvContent += `${date},${empId},${name},${dept},${desig},${checkIn},${checkOut},${statusVal}\r\n`;
    });

    // Set download headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    console.error('Error exporting CSV:', err.message);
    res.status(500).json({ error: 'Internal server error while exporting report.' });
  }
};

// GET /api/attendance/export-excel (Download Excel .xlsx report)
const exportAttendanceExcel = async (req, res) => {
  try {
    const { search = '', status = '', startDate = '', endDate = '' } = req.query;

    let queryConditions = [];
    let queryParams = [];

    if (search.trim()) {
      queryConditions.push('(e.name LIKE ? OR a.employee_id LIKE ? OR e.department LIKE ?)');
      const wildcard = `%${search.trim()}%`;
      queryParams.push(wildcard, wildcard, wildcard);
    }
    if (status.trim()) {
      queryConditions.push('a.status = ?');
      queryParams.push(status.trim());
    }
    if (startDate.trim()) {
      queryConditions.push('a.date >= ?');
      queryParams.push(startDate.trim());
    }
    if (endDate.trim()) {
      queryConditions.push('a.date <= ?');
      queryParams.push(endDate.trim());
    }

    const whereClause = queryConditions.length > 0 ? `WHERE ${queryConditions.join(' AND ')}` : '';
    const sql = `
      SELECT a.date, a.employee_id, e.name, e.department, e.designation, a.check_in, a.check_out, a.status
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      ${whereClause}
      ORDER BY a.date DESC, a.employee_id ASC
    `;
    const records = await db.query(sql, queryParams);

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AttendTrack System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Attendance Report');

    // Header row with styling
    sheet.columns = [
      { header: 'Date',           key: 'date',        width: 14 },
      { header: 'Employee ID',    key: 'employee_id', width: 14 },
      { header: 'Employee Name',  key: 'name',        width: 22 },
      { header: 'Department',     key: 'department',  width: 18 },
      { header: 'Designation',    key: 'designation', width: 22 },
      { header: 'Check-In',       key: 'check_in',    width: 12 },
      { header: 'Check-Out',      key: 'check_out',   width: 12 },
      { header: 'Status',         key: 'status',      width: 12 }
    ];

    // Style the header row
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    headerRow.height = 22;

    // Add data rows
    records.forEach((row, i) => {
      const dataRow = sheet.addRow({
        date:        row.date        || '',
        employee_id: row.employee_id || '',
        name:        row.name        || '',
        department:  row.department  || '',
        designation: row.designation || '',
        check_in:    row.check_in    || '-',
        check_out:   row.check_out   || '-',
        status:      row.status      || ''
      });

      // Alternate row shading
      const bgColor = i % 2 === 0 ? 'FFF5F3FF' : 'FFFFFFFF';
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };

        // Color-code the status cell
        if (cell.col === 8) {
          if (row.status === 'Present')  cell.font = { bold: true, color: { argb: 'FF16A34A' } };
          if (row.status === 'Late')     cell.font = { bold: true, color: { argb: 'FFD97706' } };
          if (row.status === 'Absent')   cell.font = { bold: true, color: { argb: 'FFDC2626' } };
        }
      });
    });

    // Stream the file to response
    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${today}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting Excel:', err.message);
    res.status(500).json({ error: 'Internal server error while exporting Excel report.' });
  }
};

module.exports = {
  getAttendanceRecords,
  getEmployeeAttendanceHistory,
  markAttendance,
  getAttendanceSummary,
  exportAttendanceRecords,
  exportAttendanceExcel
};
