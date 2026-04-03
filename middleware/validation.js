const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation rules
const studentValidation = {
  create: [
    body('name').trim().notEmpty().withMessage('Student name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('sectionId').isInt().withMessage('Valid section ID is required'),
    validate
  ],
  update: [
    param('id').isInt().withMessage('Valid student ID is required'),
    body('name').optional().trim().notEmpty().withMessage('Student name cannot be empty')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('sectionId').optional().isInt().withMessage('Valid section ID is required'),
    validate
  ],
  delete: [
    param('id').isInt().withMessage('Valid student ID is required'),
    validate
  ]
};

const sectionValidation = {
  create: [
    body('name').trim().notEmpty().withMessage('Section name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Section name must be between 2 and 50 characters'),
    validate
  ],
  update: [
    param('id').isInt().withMessage('Valid section ID is required'),
    body('name').trim().notEmpty().withMessage('Section name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Section name must be between 2 and 50 characters'),
    validate
  ],
  delete: [
    param('id').isInt().withMessage('Valid section ID is required'),
    validate
  ]
};

const attendanceValidation = {
  create: [
    body('date').isISO8601().toDate().withMessage('Valid date is required (YYYY-MM-DD)'),
    body('records').isArray({ min: 1 }).withMessage('At least one attendance record is required'),
    body('records.*.studentId').isInt().withMessage('Valid student ID is required'),
    body('records.*.status').isIn(['Present', 'Absent', 'Late Present', 'Excused'])
      .withMessage('Status must be Present, Absent, Late Present, or Excused'),
    body('records.*.notes').optional().trim().isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    body('sectionId').isInt().withMessage('Valid section ID is required'),
    validate
  ],
  bulk: [
    body('date').isISO8601().toDate().withMessage('Valid date is required (YYYY-MM-DD)'),
    body('sectionId').isInt().withMessage('Valid section ID is required'),
    body('status').isIn(['Present', 'Absent', 'Late Present', 'Excused'])
      .withMessage('Status must be Present, Absent, Late Present, or Excused'),
    validate
  ],
  history: [
    query('sectionId').optional().isInt().withMessage('Valid section ID is required'),
    query('studentId').optional().isInt().withMessage('Valid student ID is required'),
    query('startDate').optional().isISO8601().withMessage('Valid start date required (YYYY-MM-DD)'),
    query('endDate').optional().isISO8601().withMessage('Valid end date required (YYYY-MM-DD)'),
    validate
  ],
  download: [
    query('date').optional().isISO8601().withMessage('Valid date required (YYYY-MM-DD)'),
    query('sectionId').isInt().withMessage('Valid section ID is required'),
    query('startDate').optional().isISO8601().withMessage('Valid start date required (YYYY-MM-DD)'),
    query('endDate').optional().isISO8601().withMessage('Valid end date required (YYYY-MM-DD)'),
    validate
  ],
  delete: [
    param('id').isInt().withMessage('Valid attendance ID is required'),
    validate
  ]
};

const authValidation = {
  login: [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ]
};

module.exports = {
  studentValidation,
  sectionValidation,
  attendanceValidation,
  authValidation,
  validate
};
