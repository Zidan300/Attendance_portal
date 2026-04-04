const express = require('express');
const router = express.Router();
const { Student, Attendance, Section } = require('../models/index');
const authenticate = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const puppeteer = require('puppeteer');
const { Op } = require('sequelize');

// Mark attendance with duplicate prevention
router.post('/', authenticate, async (req, res) => {
  const { date, records, sectionId } = req.body;

  if (!date || !records || !sectionId) {
    return res.status(400).json({ message: 'Date, records, and sectionId are required' });
  }

  try {
    // Check for existing complete submission for this section and date
    const existingCount = await Attendance.count({
      where: { date, SectionId: sectionId }
    });

    // If records exist and matches student count, it's a resubmission (update)
    // This allows updates while preventing true duplicates
    
    for (const rec of records) {
      const existing = await Attendance.findOne({ 
        where: { date, StudentId: rec.studentId } 
      });
      
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
    
    res.json({ 
      message: existingCount > 0 ? 'Attendance updated successfully' : 'Attendance saved successfully', 
      count: records.length 
    });
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

// Download PDF with enhanced visual design
router.get('/download/pdf', authenticate, async (req, res) => {
  let browser;
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

    // Calculate summary statistics
    let present = 0, absent = 0, late = 0;
    records.forEach((rec) => {
      if (rec.status === 'Present') present++;
      else if (rec.status === 'Absent') absent++;
      else if (rec.status === 'Late Present') late++;
    });

    // Create HTML template with professional styling
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attendance Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #ffffff;
      padding: 40px;
      color: #333;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #ff6b35;
    }
    
    .header h1 {
      color: #ff6b35;
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 15px;
      letter-spacing: 1px;
    }
    
    .header .info {
      font-size: 18px;
      color: #555;
      margin-top: 10px;
    }
    
    .header .info strong {
      color: #ff6b35;
      font-weight: 600;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    
    thead {
      background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
      color: white;
    }
    
    thead th {
      padding: 18px 15px;
      text-align: left;
      font-weight: 600;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    thead th:first-child {
      width: 80px;
      text-align: center;
    }
    
    thead th:last-child {
      width: 180px;
      text-align: center;
    }
    
    tbody tr {
      border-bottom: 1px solid #e0e0e0;
      transition: background-color 0.2s;
    }
    
    tbody tr:nth-child(even) {
      background-color: #fafafa;
    }
    
    tbody tr:hover {
      background-color: #fff3e0;
    }
    
    tbody td {
      padding: 15px;
      font-size: 15px;
      color: #444;
    }
    
    tbody td:first-child {
      text-align: center;
      font-weight: 600;
      color: #666;
    }
    
    tbody td:last-child {
      text-align: center;
    }
    
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-present {
      background-color: #4caf50;
      color: white;
      box-shadow: 0 2px 5px rgba(76, 175, 80, 0.3);
    }
    
    .status-absent {
      background-color: #f44336;
      color: white;
      box-shadow: 0 2px 5px rgba(244, 67, 54, 0.3);
    }
    
    .status-late {
      background-color: #ffc107;
      color: #333;
      box-shadow: 0 2px 5px rgba(255, 193, 7, 0.3);
    }
    
    .summary {
      margin-top: 40px;
      padding: 25px;
      background: linear-gradient(135deg, #fff9f5 0%, #ffe8d9 100%);
      border-radius: 12px;
      border-left: 5px solid #ff6b35;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }
    
    .summary h2 {
      color: #ff6b35;
      font-size: 24px;
      margin-bottom: 20px;
      font-weight: 700;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    
    .summary-item {
      padding: 15px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05);
    }
    
    .summary-item .label {
      font-size: 14px;
      color: #777;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .summary-item .value {
      font-size: 28px;
      font-weight: 700;
      color: #333;
    }
    
    .summary-item.present .value { color: #4caf50; }
    .summary-item.absent .value { color: #f44336; }
    .summary-item.late .value { color: #ffc107; }
    .summary-item.total .value { color: #ff6b35; }
    .summary-item.percentage .value { color: #2196f3; }
    
    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Attendance Report</h1>
    <div class="info">
      <p><strong>Section:</strong> ${section ? section.name : 'Unknown'}</p>
      <p><strong>Date:</strong> ${date} (${dayName})</p>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Student Name</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${records.map((rec, index) => {
        let statusClass = '';
        if (rec.status === 'Present') statusClass = 'status-present';
        else if (rec.status === 'Absent') statusClass = 'status-absent';
        else if (rec.status === 'Late Present') statusClass = 'status-late';
        
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${rec.Student.name}</td>
            <td><span class="status-badge ${statusClass}">${rec.status}</span></td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  
  <div class="summary">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-item total">
        <div class="label">Total Students</div>
        <div class="value">${records.length}</div>
      </div>
      <div class="summary-item percentage">
        <div class="label">Attendance Rate</div>
        <div class="value">${((present + late) / records.length * 100).toFixed(1)}%</div>
      </div>
      <div class="summary-item present">
        <div class="label">Present</div>
        <div class="value">${present}</div>
      </div>
      <div class="summary-item absent">
        <div class="label">Absent</div>
        <div class="value">${absent}</div>
      </div>
      <div class="summary-item late">
        <div class="label">Late Present</div>
        <div class="value">${late}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Launch Puppeteer and generate PDF
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();
    browser = null;

    // Send PDF to client
    const filename = `attendance_${date}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);

  } catch (err) {
    if (browser) {
      await browser.close();
    }
    console.error('PDF generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get attendance history for a section
router.get('/history', authenticate, async (req, res) => {
  try {
    const { sectionId } = req.query;
    
    if (!sectionId) {
      return res.status(400).json({ message: 'Section ID is required' });
    }

    // Get all unique dates for this section
    const attendanceRecords = await Attendance.findAll({
      where: { SectionId: sectionId },
      include: [
        { 
          model: Student, 
          attributes: ['id', 'name'] 
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    // Group by date
    const historyByDate = {};
    attendanceRecords.forEach(record => {
      const date = record.date;
      if (!historyByDate[date]) {
        historyByDate[date] = {
          date: date,
          records: [],
          summary: { present: 0, absent: 0, late: 0, total: 0 }
        };
      }
      
      historyByDate[date].records.push({
        id: record.id,
        studentId: record.StudentId,
        studentName: record.Student.name,
        status: record.status,
        createdAt: record.createdAt
      });

      // Update summary
      historyByDate[date].summary.total++;
      if (record.status === 'Present') historyByDate[date].summary.present++;
      else if (record.status === 'Absent') historyByDate[date].summary.absent++;
      else if (record.status === 'Late Present') historyByDate[date].summary.late++;
    });

    // Convert to array and calculate percentages
    const history = Object.values(historyByDate).map(day => ({
      ...day,
      summary: {
        ...day.summary,
        percentage: day.summary.total > 0 
          ? ((day.summary.present + day.summary.late) / day.summary.total * 100).toFixed(1)
          : 0
      }
    }));

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete attendance record
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const record = await Attendance.findByPk(id);
    
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    await record.destroy();
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all attendance for a specific date and section
router.delete('/date/:date/:sectionId', authenticate, async (req, res) => {
  try {
    const { date, sectionId } = req.params;
    
    const count = await Attendance.destroy({
      where: { 
        date: date,
        SectionId: sectionId
      }
    });

    res.json({ 
      message: `Deleted ${count} attendance record(s)`,
      count: count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
