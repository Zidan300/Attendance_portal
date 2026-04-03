const express = require('express');
const router = express.Router();
const { Student } = require('../models/index');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { sectionId } = req.query;
    const where = sectionId ? { SectionId: sectionId } : {};
    const students = await Student.findAll({ where });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, sectionId } = req.body;
    if (!name || !sectionId) return res.status(400).json({ message: 'Name and sectionId are required' });
    const student = await Student.create({ name, SectionId: sectionId });
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
