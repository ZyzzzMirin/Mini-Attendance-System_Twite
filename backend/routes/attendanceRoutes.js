const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/auth');

// All attendance routes require authentication
router.use(authenticateToken);

router.get('/', attendanceController.getAttendanceRecords);
router.get('/export', attendanceController.exportAttendanceRecords);
router.get('/export-excel', attendanceController.exportAttendanceExcel);
router.get('/summary', attendanceController.getAttendanceSummary);
router.get('/employee/:employee_id', attendanceController.getEmployeeAttendanceHistory);
router.post('/mark', attendanceController.markAttendance);

module.exports = router;
