'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add SectionId to Students table
    await queryInterface.addColumn('Students', 'SectionId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Sections',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      allowNull: true
    });

    // Add SectionId to Attendances table
    await queryInterface.addColumn('Attendances', 'SectionId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Sections',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Students', 'SectionId');
    await queryInterface.removeColumn('Attendances', 'SectionId');
  }
};
