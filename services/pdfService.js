const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');

function generateAttendancePDF(options) {
  const { date, startDate, endDate, section, records, stacked = false } = options;
  
  const doc = new PDFDocument({ 
    size: 'A4', 
    margin: 50,
    info: {
      Title: `Attendance Report - ${section.name}`,
      Author: 'EduAttend Pro',
      Subject: 'Attendance Report'
    }
  });

  doc.fontSize(20).font('Helvetica-Bold')
     .text('EduAttend Pro', { align: 'center' })
     .moveDown(0.5);
  
  doc.fontSize(16).font('Helvetica')
     .text('Attendance Report', { align: 'center' })
     .moveDown(1);

  doc.fontSize(12).font('Helvetica-Bold')
     .text(`Section: ${section.name}`, 50, doc.y);
  
  if (stacked && startDate && endDate) {
    doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 50, doc.y);
  } else if (date) {
    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    doc.text(`Date: ${formatDate(date)} (${dayName})`, 50, doc.y);
  }
  
  doc.moveDown(1.5);

  if (stacked) {
    generateStackedReport(doc, records);
  } else {
    generateSingleDayReport(doc, records);
  }

  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica')
       .text(
         `Generated on ${new Date().toLocaleString()} | Page ${i + 1} of ${pageCount}`,
         50,
         doc.page.height - 50,
         { align: 'center' }
       );
  }

  doc.end();
  return doc;
}

function generateSingleDayReport(doc, records) {
  const statusColors = {
    'Present': '#10b981',
    'Absent': '#ef4444',
    'Late Present': '#f59e0b',
    'Excused': '#3b82f6'
  };

  const tableTop = doc.y;
  const tableHeaders = ['#', 'Student Name', 'Status', 'Notes'];
  const columnWidths = [30, 200, 100, 165];
  let currentX = 50;

  doc.font('Helvetica-Bold').fontSize(11);
  tableHeaders.forEach((header, i) => {
    doc.text(header, currentX, tableTop, { width: columnWidths[i], align: 'left' });
    currentX += columnWidths[i];
  });

  doc.moveTo(50, tableTop + 20).lineTo(545, tableTop + 20).stroke();
  
  let currentY = tableTop + 30;
  doc.font('Helvetica').fontSize(10);

  const summary = {
    Present: 0,
    Absent: 0,
    'Late Present': 0,
    Excused: 0
  };

  records.forEach((record, index) => {
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;
    }

    const status = record.status || 'Not Marked';
    summary[status] = (summary[status] || 0) + 1;

    currentX = 50;
    doc.text((index + 1).toString(), currentX, currentY, { width: columnWidths[0] });
    currentX += columnWidths[0];
    doc.text(record.Student.name, currentX, currentY, { width: columnWidths[1] });
    currentX += columnWidths[1];
    doc.fillColor(statusColors[status] || '#6b7280')
       .text(status, currentX, currentY, { width: columnWidths[2] });
    doc.fillColor('#000000');
    currentX += columnWidths[2];
    doc.fontSize(9).text(record.notes || '-', currentX, currentY, { 
      width: columnWidths[3],
      height: 15,
      ellipsis: true
    });
    doc.fontSize(10);
    currentY += 25;
  });

  doc.moveDown(2);
  currentY = doc.y + 20;
  
  if (currentY > 650) {
    doc.addPage();
    currentY = 50;
  }

  doc.fontSize(12).font('Helvetica-Bold')
     .text('Summary', 50, currentY);
  
  currentY += 25;
  doc.fontSize(10).font('Helvetica');
  
  Object.keys(summary).forEach(status => {
    const color = statusColors[status] || '#6b7280';
    doc.fillColor(color)
       .text(`${status}: ${summary[status]}`, 50, currentY);
    currentY += 20;
  });
  
  doc.fillColor('#000000');
  doc.fontSize(11).font('Helvetica-Bold')
     .text(`Total: ${records.length}`, 50, currentY);
}

function generateStackedReport(doc, recordsByDate) {
  const dates = Object.keys(recordsByDate).sort();
  
  dates.forEach((dateStr, dateIndex) => {
    if (dateIndex > 0) {
      doc.addPage();
    }

    const dateObj = new Date(dateStr);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    
    doc.fontSize(14).font('Helvetica-Bold')
       .text(`${formatDate(dateStr)} (${dayName})`, 50, 50)
       .moveDown(1);

    generateSingleDayReport(doc, recordsByDate[dateStr]);
  });
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

module.exports = { generateAttendancePDF };
