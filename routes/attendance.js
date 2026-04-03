const express = require('express');
const router = express.Router();
const { Student, Attendance, Section } = require('../models/index');
const authenticate = require('../middleware/auth');

router.post('/', authenticate, async (req, res) => {
  const { date, records, sectionId } = req.body;
  if (!date || !records || !sectionId) return res.status(400).json({ message: 'Missing date, records or sectionId' });

  try {
    for (const rec of records) {
      const existing = await Attendance.findOne({ where: { date, StudentId: rec.studentId } });
      if (existing) {
        existing.status = rec.status;
        existing.UserId = req.user.id;
        existing.SectionId = sectionId;
        await existing.save();
      } else {
        await Attendance.create({
          date,
          status: rec.status,
          StudentId: rec.studentId,
          UserId: req.user.id,
          SectionId: sectionId
        });
      }
    }
    res.json({ message: 'Attendance saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const { sectionId } = req.query;
    const where = sectionId ? { SectionId: sectionId } : {};
    const history = await Attendance.findAll({
      where,
      include: [
        { model: Student, attributes: ['name'] },
        { model: Section, attributes: ['name'] }
      ],
      order: [['date', 'DESC']]
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/download', authenticate, async (req, res) => {
  try {
    const { date, sectionId } = req.query;
    if (!date || !sectionId) return res.status(400).json({ message: 'Missing date or sectionId' });

    const section = await Section.findByPk(sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    const records = await Attendance.findAll({
      where: { date, SectionId: sectionId },
      include: [{ model: Student, attributes: ['name'] }]
    });

    if (records.length === 0) return res.status(404).json({ message: 'No records found' });

    let content = `Attendance Report for Section: ${section.name}\n`;
    content += `Date: ${date}\n`;
    content += `--------------------------------\n`;
    records.forEach(rec => {
      content += `${rec.Student.name}: ${rec.status}\n`;
    });

    const dateObj = new Date(date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
    const filename = `attendance_${section.name}_${day}_${monthName}.txt`;

    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'text/plain');
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
