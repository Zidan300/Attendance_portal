const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/index');
const authenticate = require('../middleware/auth');
require('dotenv').config();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ where: { username } });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );
    
    res.json({ 
      token, 
      user: { id: user.id, username: user.username } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify token endpoint
router.get('/verify', authenticate, async (req, res) => {
  try {
    res.json({ 
      valid: true, 
      user: { id: req.user.id, username: req.user.username } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
