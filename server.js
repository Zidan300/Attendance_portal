const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { sequelize, User, Section, Student } = require('./models/index');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const sectionRoutes = require('./routes/sections');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);

// Database Initialization
const initializeDB = async () => {
  try {
    await sequelize.sync({ alter: true }); // Update tables without data loss
    console.log('Database synchronized.');

    // Seed default user if not exists
    const existingUser = await User.findOne({ where: { username: 'teacher1' } });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({ username: 'teacher1', password: hashedPassword });
      console.log('Default user created: teacher1/password123');
    }

    // Seed default section if none exist
    const sectionCount = await Section.count();
    if (sectionCount === 0) {
      await Section.create({ name: 'Default Section' });
      console.log('Default section created.');
    }

    console.log('Database ready.');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
};

const PORT = process.env.PORT || 3000;
initializeDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
