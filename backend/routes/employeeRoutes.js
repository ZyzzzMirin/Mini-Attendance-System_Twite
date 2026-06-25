const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All employee routes require authentication
router.use(authenticateToken);

router.get('/', employeeController.getEmployees);
router.get('/:id', employeeController.getEmployeeById);

// Admin-only operations
router.post('/', requireAdmin, employeeController.createEmployee);
router.put('/:id', requireAdmin, employeeController.updateEmployee);
router.delete('/:id', requireAdmin, employeeController.deleteEmployee);

module.exports = router;
