const db = require('../db');

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  const today = req.query.date || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    // 1. Total Employees
    const totalEmpResult = await db.queryOne('SELECT COUNT(*) as count FROM employees');
    const totalEmployees = totalEmpResult ? totalEmpResult.count : 0;

    // 2. Active Employees
    const activeEmpResult = await db.queryOne("SELECT COUNT(*) as count FROM employees WHERE status = 'Active'");
    const activeEmployees = activeEmpResult ? activeEmpResult.count : 0;

    // 3. Present Today (checked-in under status Present or Late)
    const presentResult = await db.queryOne(
      "SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status IN ('Present', 'Late')",
      [today]
    );
    const presentToday = presentResult ? presentResult.count : 0;

    // 4. Absent Today (Active Employees who haven't checked-in today)
    const absentToday = Math.max(0, activeEmployees - presentToday);

    // 5. Department-wise Employee Count
    const deptDistribution = await db.query(
      'SELECT department, COUNT(*) as count FROM employees GROUP BY department'
    );

    // 6. Recent Attendance Logs (limit to 5)
    const recentLogs = await db.query(
      `SELECT a.*, e.name, e.department, e.designation 
       FROM attendance a
       JOIN employees e ON a.employee_id = e.employee_id
       WHERE a.date = ? 
       ORDER BY a.updated_at DESC
       LIMIT 5`,
      [today]
    );

    res.json({
      today,
      stats: {
        totalEmployees,
        activeEmployees,
        presentToday,
        absentToday
      },
      departmentDistribution: deptDistribution,
      recentLogs
    });
  } catch (err) {
    console.error('Error fetching dashboard statistics:', err.message);
    res.status(500).json({ error: 'Internal server error while fetching dashboard statistics.' });
  }
};

module.exports = {
  getDashboardStats
};
