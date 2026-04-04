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
    // Use force: false to create tables only if they don't exist
    // This avoids the alter table backup issues
    await sequelize.sync({ force: false });
    console.log('Database synchronized.');

    // Seed default user if not exists
    const existingUser = await User.findOne({ where: { username: 'zidan' } });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('zidan123', 10);
      await User.create({ username: 'zidan', password: hashedPassword });
      console.log('Default user created: zidan/zidan123');
    } else {
      console.log('Default user already exists: zidan/zidan123');
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
    // Don't throw - server can still run
  }
};

const PORT = process.env.PORT || 3000;
initializeDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
