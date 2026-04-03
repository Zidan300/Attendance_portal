const express = require('express');
const router = express.Router();
const { Section } = require('../models/index');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const sections = await Section.findAll();
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const section = await Section.create({ name });
    res.status(201).json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
