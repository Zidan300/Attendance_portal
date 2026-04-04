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
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { 
    type: DataTypes.ENUM('Present', 'Absent', 'Late Present'), 
    allowNull: false 
  }
});

// Relationships with cascade delete
User.hasMany(Attendance);
Attendance.belongsTo(User);

Section.hasMany(Student, { onDelete: 'CASCADE', hooks: true });
Student.belongsTo(Section);

Section.hasMany(Attendance, { onDelete: 'CASCADE', hooks: true });
Attendance.belongsTo(Section);

Student.hasMany(Attendance, { onDelete: 'CASCADE', hooks: true });
Attendance.belongsTo(Student);

module.exports = { sequelize, User, Section, Student, Attendance };
