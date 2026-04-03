const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { sequelize, User, Section, Student } = require('./models/index');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const sectionRoutes = require('./routes/sections');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/sections', sectionRoutes);

// Seeding and Migration Function
const initializeDB = async () => {
  try {
    // Sync models (force: false preserves data)
    await sequelize.sync({ force: false });

    // --- MANUAL MIGRATIONS ---
    const queryInterface = sequelize.getQueryInterface();
    
    // Check Students table
    const studentTableInfo = await queryInterface.describeTable('Students');
    if (!studentTableInfo.SectionId) {
      console.log('Migrating: Adding SectionId to Students table...');
      await queryInterface.addColumn('Students', 'SectionId', {
        type: require('sequelize').DataTypes.INTEGER,
        references: { model: 'Sections', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true
      });
    }

    // Check Attendances table
    const attendanceTableInfo = await queryInterface.describeTable('Attendances');
    if (!attendanceTableInfo.SectionId) {
      console.log('Migrating: Adding SectionId to Attendances table...');
      await queryInterface.addColumn('Attendances', 'SectionId', {
        type: require('sequelize').DataTypes.INTEGER,
        references: { model: 'Sections', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true
      });
    }
    console.log('Database schema is up to date.');

    // --- SEEDING ---
    const userCount = await User.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({ username: 'teacher1', password: hashedPassword });
      console.log('Seed: User teacher1 created.');
    }

    const sectionCount = await Section.count();
    let defaultSection;
    if (sectionCount === 0) {
      defaultSection = await Section.create({ name: 'Grade 10 - A' });
      await Section.create({ name: 'Grade 10 - B' });
      console.log('Seed: Sample sections created.');
    } else {
      defaultSection = await Section.findOne();
    }

    const studentCount = await Student.count();
    if (studentCount === 0) {
      await Student.create({ name: 'Alice Smith', SectionId: defaultSection.id });
      await Student.create({ name: 'Bob Jones', SectionId: defaultSection.id });
      console.log('Seed: Sample students created and linked to sections.');
    } else {
      // Fix existing students that might have null SectionId after migration
      const orphanedStudents = await Student.findAll({ where: { SectionId: null } });
      if (orphanedStudents.length > 0) {
        console.log(`Seed: Fixing ${orphanedStudents.length} students without sections...`);
        for (const s of orphanedStudents) {
          s.SectionId = defaultSection.id;
          await s.save();
        }
      }
    }

    // Fix existing attendance that might have null SectionId after migration
    const { Attendance } = require('./models/index');
    const orphanedAttendance = await Attendance.findAll({ where: { SectionId: null } });
    if (orphanedAttendance.length > 0) {
      console.log(`Seed: Fixing ${orphanedAttendance.length} attendance records without sections...`);
      for (const att of orphanedAttendance) {
        // Try to get section from student, else use default
        const student = await Student.findByPk(att.StudentId);
        att.SectionId = student ? student.SectionId : defaultSection.id;
        await att.save();
      }
    }
  } catch (error) {
    console.error('Initialization Error:', error);
  }
};

const PORT = process.env.PORT || 5000;
initializeDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
