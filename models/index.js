const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.db'),
  logging: false
});

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false }
});

const Section = sequelize.define('Section', {
  name: { type: DataTypes.STRING, allowNull: false, unique: true }
});

const Student = sequelize.define('Student', {
  name: { type: DataTypes.STRING, allowNull: false }
});

const Attendance = sequelize.define('Attendance', {
  date: { type: DataTypes.STRING, allowNull: false }, // Format: YYYY-MM-DD
  status: { 
    type: DataTypes.ENUM('Present', 'Absent', 'Late Present'), 
    allowNull: false 
  }
});

// Relationships
User.hasMany(Attendance);
Attendance.belongsTo(User);

Section.hasMany(Student);
Student.belongsTo(Section);

Section.hasMany(Attendance);
Attendance.belongsTo(Section);

Student.hasMany(Attendance);
Attendance.belongsTo(Student);

module.exports = { sequelize, User, Section, Student, Attendance };
