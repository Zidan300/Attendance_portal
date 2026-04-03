const express = require('express');
const router = express.Router();
const { Student, Attendance, Section } = require('../models/index');
const authenticate = require('../middleware/auth');
const PDFDocument = require('pdfkit');

// Mark attendance
router.post('/', authenticate, async (req, res) => {
  const { date, records, sectionId } = req.body;

  if (!date || !records || !sectionId) {
    return res.status(400).json({ message: 'Date, records, and sectionId are required' });
  }

  try {
    for (const rec of records) {
      const existing = await Attendance.findOne({ 
        where: { date, StudentId: rec.studentId } 
      });
      
      if (existing) {
        existing.status = rec.status;
        existing.UserId = req.user.id;
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
    
    res.json({ message: 'Attendance saved successfully', count: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attendance for a specific date
router.get('/date', authenticate, async (req, res) => {
  try {
    const { date, sectionId } = req.query;
    
    if (!date || !sectionId) {
      return res.status(400).json({ message: 'Date and sectionId are required' });
    }

    const records = await Attendance.findAll({
      where: { date, SectionId: sectionId },
      include: [{ model: Student, attributes: ['id', 'name'] }]
    });
    
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download TXT
router.get('/download/txt', authenticate, async (req, res) => {
  try {
    const { date, sectionId } = req.query;
    
    if (!date || !sectionId) {
      return res.status(400).json({ message: 'Date and sectionId are required' });
    }

    const section = await Section.findByPk(sectionId);
    const records = await Attendance.findAll({
      where: { date, SectionId: sectionId },
      include: [{ model: Student, attributes: ['name'] }],
      order: [[Student, 'name', 'ASC']]
    });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No attendance records found' });
    }

    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    
    let content = `Attendance Report\n`;
    content += `Section: ${section ? section.name : 'Unknown'}\n`;
    content += `Date: ${date} (${dayName})\n`;
    content += `================================\n\n`;

    let present = 0, absent = 0, late = 0;
    records.forEach(rec => {
      content += `${rec.Student.name}: ${rec.status}\n`;
      if (rec.status === 'Present') present++;
      else if (rec.status === 'Absent') absent++;
      else if (rec.status === 'Late Present') late++;
    });

    content += `\n================================\n`;
    content += `Summary:\n`;
    content += `Total Students: ${records.length}\n`;
    content += `Present: ${present}\n`;
    content += `Absent: ${absent}\n`;
    content += `Late Present: ${late}\n`;
    content += `Attendance %: ${((present + late) / records.length * 100).toFixed(1)}%\n`;

    const filename = `attendance_${date}.txt`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download PDF
router.get('/download/pdf', authenticate, async (req, res) => {
  try {
    const { date, sectionId } = req.query;
    
    if (!date || !sectionId) {
      return res.status(400).json({ message: 'Date and sectionId are required' });
    }

    const section = await Section.findByPk(sectionId);
    const records = await Attendance.findAll({
      where: { date, SectionId: sectionId },
      include: [{ model: Student, attributes: ['name'] }],
      order: [[Student, 'name', 'ASC']]
    });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No attendance records found' });
    }

    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    const doc = new PDFDocument({ margin: 50 });
    const filename = `attendance_${date}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Section: ${section ? section.name : 'Unknown'}`, { align: 'center' });
    doc.text(`Date: ${date} (${dayName})`, { align: 'center' });
    doc.moveDown(2);

    // Table
    doc.fontSize(10);
    let y = doc.y;
    
    doc.text('#', 50, y, { width: 30 });
    doc.text('Student Name', 90, y, { width: 200 });
    doc.text('Status', 300, y, { width: 100 });
    
    y += 20;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    let present = 0, absent = 0, late = 0;
    records.forEach((rec, index) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc.text((index + 1).toString(), 50, y, { width: 30 });
      doc.text(rec.Student.name, 90, y, { width: 200 });
      doc.text(rec.status, 300, y, { width: 100 });
      
      if (rec.status === 'Present') present++;
      else if (rec.status === 'Absent') absent++;
      else if (rec.status === 'Late Present') late++;

      y += 20;
    });

    // Summary
    doc.moveDown(2);
    y = doc.y + 20;
    doc.fontSize(12).text('Summary:', 50, y);
    y += 20;
    doc.fontSize(10);
    doc.text(`Total Students: ${records.length}`, 50, y);
    y += 15;
    doc.text(`Present: ${present}`, 50, y);
    y += 15;
    doc.text(`Absent: ${absent}`, 50, y);
    y += 15;
    doc.text(`Late Present: ${late}`, 50, y);
    y += 15;
    doc.text(`Attendance %: ${((present + late) / records.length * 100).toFixed(1)}%`, 50, y);

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
