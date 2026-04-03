# 🎓 School Attendance Portal

A fully functional, professional school attendance management system with daily attendance reset, notifications, and a beautiful orange/white theme.

## ✨ Features

### 🔐 Authentication
- **Default Login Credentials:**
  - Username: `zidan`
  - Password: `zidan123`

### 📚 Section Management
- Create multiple sections/classes
- Rename sections
- Delete sections (with safety checks)
- Organized section selection interface

### 👨‍🎓 Student Management
- **Editor Mode** for easy student entry
- Add/remove students in bulk
- Automatic alphabetical sorting after saving
- Students persist across days
- Student attendance history tracking

### 📊 Attendance Features
- **Daily Reset**: Attendance statuses reset automatically each day while student names remain
- Mark students as:
  - ✓ Present (Green)
  - ✗ Absent (Red)
  - ⏰ Late Present (Yellow)
- Real-time attendance statistics
- Visual feedback with color-coded buttons
- Smooth toggle animations

### 🔔 Notifications
- **Toast-style notifications** for all actions:
  - "Attendance submitted successfully" when Submit is clicked
  - "File downloaded successfully" when download succeeds
  - "Please submit attendance first" if trying to download before submission
  - Login/logout confirmations
  - Error messages for failed operations
- Non-intrusive, auto-disappearing toasts (3 seconds)

### 📥 Export Features
- **Download TXT**: Plain text attendance report
- **Download PDF**: Professionally formatted PDF report
- **Smart Download Protection**: Cannot download until attendance is submitted
- Reports include:
  - Section name
  - Date and day of week
  - Individual student statuses
  - Summary statistics
  - Attendance percentage

### 🎨 UI/UX Design
- **Orange & White Theme**: Professional and vibrant
- **Colorful Action Buttons**:
  - Submit: Green gradient
  - Download TXT: Cyan gradient
  - Download PDF: Purple gradient
  - Edit Students: Blue gradient
  - Settings: Gray gradient
  - Logout: Red gradient
- **Responsive Design**: Works perfectly on desktop and mobile
- **Smooth Animations**: Hover effects, transitions, and state changes
- **Professional Layout**: Clean spacing, proper alignment
- **Watermark**: "Made by Zidan" on all pages

### 💾 Data Persistence
- SQLite database for reliable data storage
- Attendance history saved per section and date
- Student records persist across sessions
- Section configurations maintained

## 🚀 Getting Started

### Installation

1. **Clone or navigate to the project:**
   ```bash
   cd /Users/zidan/Desktop/backend/backend
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   node server.js
   ```

4. **Access the portal:**
   Open your browser to: `http://localhost:3000`

5. **Login with default credentials:**
   - Username: `zidan`
   - Password: `zidan123`

## 📖 Usage Guide

### First Time Setup

1. **Login** with the default credentials
2. **Create a Section** (e.g., "Grade 10A", "Year 7B")
3. **Click on the section** to enter attendance mode
4. **Click "Edit Students"** to enter editor mode
5. **Add student names** one by one
6. **Click "Done (Save & Sort)"** to finalize the list

### Daily Attendance Workflow

1. **Select your section** from the section page
2. **Verify the date** (defaults to today)
3. **Mark attendance** for each student:
   - Click "✓ Present" for students present
   - Click "✗ Absent" for absent students
   - Click "⏰ Late" for late arrivals
4. **Review the statistics** in the stats bar
5. **Click "✓ Submit Attendance"** when complete
6. **Download reports** (TXT or PDF) if needed

### Managing Students

1. **Click "Edit Students"** on the attendance page
2. **Add new students** with the "+ Add Another Student" button
3. **Remove students** by clicking the × button
4. **Click "Done (Save & Sort)"** to save changes
5. Students are automatically sorted alphabetically

### Managing Sections

1. **Click "⚙️ Section Settings"** on the attendance page
2. **Rename** the section if needed
3. **Delete** the section in the Danger Zone (requires confirmation)

## 🏗️ Technical Architecture

### Backend (Node.js + Express)
- **Framework**: Express.js 5.2.1
- **Database**: SQLite with Sequelize ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **PDF Generation**: PDFKit
- **Security**: Rate limiting, input validation

### Frontend
- **Vanilla JavaScript**: No framework dependencies
- **Modern CSS**: Gradients, animations, responsive grid
- **Toast Notifications**: Custom implementation
- **Responsive Design**: Mobile-first approach

### Database Schema
- **Users**: Authentication and authorization
- **Sections**: Class/section management
- **Students**: Student records per section
- **Attendance**: Daily attendance records with status

### API Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/sections` - List all sections
- `POST /api/sections` - Create new section
- `PUT /api/sections/:id` - Update section
- `DELETE /api/sections/:id` - Delete section
- `GET /api/students` - List students (with filters)
- `POST /api/students` - Add student
- `DELETE /api/students/:id` - Remove student
- `POST /api/attendance` - Submit attendance
- `GET /api/attendance/date` - Get attendance for date
- `GET /api/attendance/download/txt` - Download TXT report
- `GET /api/attendance/download/pdf` - Download PDF report

## 🎯 Key Features Explained

### Daily Reset Mechanism
The portal implements a smart daily reset:
- **Student names** are permanently stored in the database
- **Attendance statuses** are stored per date
- When you change dates, the interface loads that date's attendance
- No attendance for a new date = clean slate (but students remain)
- Previous attendance is always accessible by changing the date

### Download Protection
To ensure data integrity:
1. Attendance must be **submitted** before downloading
2. If you try to download without submitting, you get a warning
3. After submission, downloads work immediately
4. This prevents downloading incomplete/unsaved data

### Notification System
- **Success notifications** (green) for completed actions
- **Warning notifications** (yellow) for preventable issues
- **Error notifications** (red) for failures
- All notifications auto-dismiss after 3 seconds
- Non-blocking UI - you can continue working

## 📱 Mobile Responsiveness

The portal is fully responsive:
- **Desktop**: Wide layout with side-by-side buttons
- **Tablet**: Adaptive grid layout
- **Mobile**: Stacked layout with full-width buttons
- Touch-friendly button sizes
- Readable text on all screen sizes

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Server-side validation
- **SQL Injection Protection**: Sequelize ORM
- **Session Management**: Automatic token expiration

## 🎨 Color Scheme

- **Primary Orange**: `#ff6600`
- **Secondary Orange**: `#ff8533`
- **White Background**: `#ffffff`
- **Light Background**: `#f5f5f5`, `#fff5e6`, `#ffe6cc`
- **Success Green**: `#28a745`
- **Error Red**: `#dc3545`
- **Warning Yellow**: `#ffc107`
- **Info Blue**: `#007bff`
- **Purple**: `#6f42c1`
- **Cyan**: `#17a2b8`

## 📝 Notes

- The portal uses **local time** for dates
- All dates are stored in `YYYY-MM-DD` format
- Student attendance history shows overall percentage
- Statistics update in real-time as you mark attendance
- Modal dialogs can be closed by clicking outside them

## 🛠️ Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify Node.js is installed: `node --version`
- Check the .env file exists with JWT_SECRET

### Can't login
- Verify you're using: `zidan` / `zidan123`
- Check browser console for errors
- Clear browser cache and cookies

### Students not saving
- Ensure you click "Done (Save & Sort)"
- Check network tab for API errors
- Verify server is running

### Downloads not working
- Make sure attendance is submitted first
- Check browser download permissions
- Verify server has write permissions

## 🎓 Made by Zidan

This professional attendance portal is designed for daily academic use with a focus on usability, reliability, and visual appeal.

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-03
