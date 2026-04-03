const express = require('express');
const router = express.Router();
const { Student } = require('../models/index');
const authenticate = require('../middleware/auth');

// Get all students (optionally filter by sectionId and include stats)
router.get('/', authenticate, async (req, res) => {
  try {
    const { sectionId, includeStats } = req.query;
    const where = sectionId ? { SectionId: sectionId } : {};
    
    const students = await Student.findAll({ 
      where,
      order: [['name', 'ASC']]
    });

    if (includeStats === 'true') {
      const { Attendance } = require('../models/index');
      const studentsWithStats = await Promise.all(students.map(async (student) => {
        const attendance = await Attendance.findAll({ where: { StudentId: student.id } });
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'Present' || a.status === 'Late Present').length;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 'N/A';
        
        return {
          ...student.toJSON(),
          stats: { total, present, percentage }
        };
      }));
      return res.json(studentsWithStats);
    }
    
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new student
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, sectionId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Student name is required' });
    }

    if (!sectionId) {
      return res.status(400).json({ message: 'Section ID is required' });
    }

    const student = await Student.create({ 
      name: name.trim(), 
      SectionId: sectionId 
    });
    
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete student
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await student.destroy();
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
