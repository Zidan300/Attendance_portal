const express = require('express');
const router = express.Router();
const { Section, Student } = require('../models/index');
const authenticate = require('../middleware/auth');

// Get all sections
router.get('/', authenticate, async (req, res) => {
  try {
    const sections = await Section.findAll({
      order: [['name', 'ASC']]
    });
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single section with students
router.get('/:id', authenticate, async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.id, {
      include: [{
        model: Student,
        order: [['name', 'ASC']]
      }]
    });
    
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }
    
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new section
router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Section name is required' });
    }
    
    const section = await Section.create({ name: name.trim() });
    res.status(201).json(section);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Section name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update section (rename)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Section name is required' });
    }
    
    section.name = name.trim();
    await section.save();
    
    res.json(section);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Section name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete section
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Delete section - students and attendance will cascade automatically
    await section.destroy();
    res.json({ message: 'Section deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
