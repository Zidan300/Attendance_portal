document.addEventListener('DOMContentLoaded', () => {
    // API Configuration
    const API_URL = window.location.origin + '/api';
    
    // Elements
    const loginForm = document.getElementById('login-form');
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const historyView = document.getElementById('history-view');
    const monthlyView = document.getElementById('monthly-view');
    const sectionSelect = document.getElementById('section-select');
    const attendanceDate = document.getElementById('attendance-date');
    const attendanceGrid = document.getElementById('attendance-grid');
    const currentTimeDisplay = document.getElementById('current-time');
    const authHeader = document.getElementById('auth-header');
    const usernameDisplay = document.getElementById('username-display');
    const logoutBtn = document.getElementById('logout-btn');
    const dashboardMsg = document.getElementById('dashboard-msg');
    const studentSearch = document.getElementById('student-search');

    // Modal elements
    const sectionModal = document.getElementById('section-modal');
    const studentModal = document.getElementById('student-modal');
    const notesModal = document.getElementById('notes-modal');
    const addSectionBtn = document.getElementById('add-section-btn');
    const addStudentBtn = document.getElementById('add-student-btn');

    // State
    let students = [];
    let attendanceRecords = {}; // studentId: { status, notes }
    let currentSections = [];
    let currentUser = null;
    let currentNoteStudentId = null;

    // Initialize
    const today = new Date().toISOString().split('T')[0];
    attendanceDate.value = today;

    // Clock
    const updateClock = () => {
        const now = new Date();
        currentTimeDisplay.innerHTML = `<i class="far fa-clock"></i> ${now.toLocaleString()}`;
    };
    setInterval(updateClock, 1000);
    updateClock();

    // Helper: Show message
    const showMessage = (text, duration = 3000) => {
        dashboardMsg.textContent = text;
        dashboardMsg.classList.remove('hidden');
        setTimeout(() => dashboardMsg.classList.add('hidden'), duration);
    };

    // Helper: API call
    const apiCall = async (endpoint, options = {}) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    };

    // Authentication
    const checkAuth = () => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (token && user) {
            currentUser = user;
            showDashboard(user.username);
        } else {
            showLogin();
        }
    };

    const showLogin = () => {
        loginView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
        historyView.classList.add('hidden');
        monthlyView.classList.add('hidden');
        authHeader.classList.add('hidden');
    };

    const showDashboard = (username) => {
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        historyView.classList.add('hidden');
        monthlyView.classList.add('hidden');
        authHeader.classList.remove('hidden');
        usernameDisplay.textContent = `👤 ${username}`;
        fetchSections();
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
        
        try {
            const data = await apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            showDashboard(data.user.username);
        } catch (error) {
            const err = document.getElementById('login-error');
            err.textContent = error.message;
            err.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        currentUser = null;
        showLogin();
    });

    // Sections
    const fetchSections = async () => {
        try {
            currentSections = await apiCall('/sections');
            renderSectionSelects();
        } catch (error) {
            console.error('Error fetching sections:', error);
        }
    };

    const renderSectionSelects = () => {
        const selects = [
            sectionSelect,
            document.getElementById('new-student-section'),
            document.getElementById('history-section-select'),
            document.getElementById('monthly-section-select')
        ];

        selects.forEach(select => {
            if (!select) return;
            const currentValue = select.value;
            const isMainSelect = select === sectionSelect;
            
            select.innerHTML = isMainSelect 
                ? '<option value="">Select Section</option>' 
                : (select.id === 'history-section-select' ? '<option value="">All Sections</option>' : '<option value="">Select Section</option>');
            
            currentSections.forEach(section => {
                const option = document.createElement('option');
                option.value = section.id;
                option.textContent = section.name;
                select.appendChild(option);
            });
            
            if (currentValue) select.value = currentValue;
        });
    };

    // Students
    const fetchStudents = async (sectionId) => {
        if (!sectionId) {
            students = [];
            renderAttendanceGrid();
            return;
        }

        try {
            students = await apiCall(`/students?sectionId=${sectionId}`);
            await fetchExistingAttendance(sectionId, attendanceDate.value);
            renderAttendanceGrid();
            updateDailyStats();
        } catch (error) {
            console.error('Error fetching students:', error);
            showMessage('Error loading students');
        }
    };

    const fetchExistingAttendance = async (sectionId, date) => {
        try {
            const records = await apiCall(`/attendance/date?sectionId=${sectionId}&date=${date}`);
            attendanceRecords = {};
            records.forEach(record => {
                attendanceRecords[record.StudentId] = {
                    status: record.status,
                    notes: record.notes || ''
                };
            });
        } catch (error) {
            console.error('Error fetching attendance:', error);
            attendanceRecords = {};
        }
    };

    const renderAttendanceGrid = () => {
        const searchTerm = studentSearch.value.toLowerCase();
        const filteredStudents = students.filter(s => 
            s.name.toLowerCase().includes(searchTerm)
        );

        attendanceGrid.innerHTML = '';

        if (filteredStudents.length === 0) {
            attendanceGrid.innerHTML = `
                <div class="card" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-users" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--text-muted);">No students found</h3>
                    <p style="color: var(--text-muted);">Select a section or add students to get started.</p>
                </div>
            `;
            return;
        }

        filteredStudents.forEach(student => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.dataset.studentId = student.id;

            // Get current attendance
            const attendance = attendanceRecords[student.id] || {};
            const status = attendance.status || '';
            const notes = attendance.notes || '';

            // Get student stats
            const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            card.innerHTML = `
                <div class="student-header">
                    ${student.photoUrl 
                        ? `<img src="${student.photoUrl}" alt="${student.name}" class="student-photo">` 
                        : `<div class="student-photo placeholder">${initials}</div>`
                    }
                    <div class="student-info">
                        <div class="student-name">${student.name}</div>
                        <div class="student-stats">ID: ${student.id}</div>
                    </div>
                </div>
                <div class="marking-buttons">
                    <button class="btn-toggle present ${status === 'Present' ? 'active' : ''}" data-status="Present">
                        <i class="fas fa-check"></i> Present
                    </button>
                    <button class="btn-toggle absent ${status === 'Absent' ? 'active' : ''}" data-status="Absent">
                        <i class="fas fa-times"></i> Absent
                    </button>
                    <button class="btn-toggle late ${status === 'Late Present' ? 'active' : ''}" data-status="Late Present">
                        <i class="fas fa-clock"></i> Late
                    </button>
                    <button class="btn-toggle excused ${status === 'Excused' ? 'active' : ''}" data-status="Excused">
                        <i class="fas fa-file-medical"></i> Excused
                    </button>
                </div>
                <button class="notes-button ${notes ? 'has-note' : ''}" data-student-id="${student.id}">
                    <i class="fas fa-sticky-note"></i> ${notes ? 'Edit Note' : 'Add Note'}
                </button>
            `;

            // Add event listeners
            const toggleButtons = card.querySelectorAll('.btn-toggle');
            toggleButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    toggleButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    attendanceRecords[student.id] = {
                        ...attendanceRecords[student.id],
                        status: btn.dataset.status
                    };
                    updateDailyStats();
                });
            });

            const notesBtn = card.querySelector('.notes-button');
            notesBtn.addEventListener('click', () => {
                currentNoteStudentId = student.id;
                document.getElementById('notes-student-name').textContent = student.name;
                document.getElementById('attendance-notes').value = notes;
                notesModal.classList.remove('hidden');
            });

            attendanceGrid.appendChild(card);
        });

        updateDailyStats();
    };
    const updateDailyStats = () => {
        const stats = {
            total: students.length,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
        };

        Object.values(attendanceRecords).forEach(record => {
            if (record.status === 'Present') stats.present++;
            else if (record.status === 'Absent') stats.absent++;
            else if (record.status === 'Late Present') stats.late++;
            else if (record.status === 'Excused') stats.excused++;
        });

        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-present').textContent = stats.present;
        document.getElementById('stat-absent').textContent = stats.absent;
        document.getElementById('stat-late').textContent = stats.late;
        document.getElementById('stat-excused').textContent = stats.excused;
    };

    // Event Listeners
    sectionSelect.addEventListener('change', (e) => {
        fetchStudents(e.target.value);
    });

    attendanceDate.addEventListener('change', () => {
        const sectionId = sectionSelect.value;
        if (sectionId) {
            fetchStudents(sectionId);
        }
    });

    studentSearch.addEventListener('input', () => {
        renderAttendanceGrid();
    });

    // Submit Attendance
    document.getElementById('submit-attendance').addEventListener('click', async () => {
        const sectionId = sectionSelect.value;
        const date = attendanceDate.value;

        if (!sectionId) {
            showMessage('Please select a section');
            return;
        }

        const records = Object.entries(attendanceRecords)
            .filter(([_, data]) => data.status)
            .map(([studentId, data]) => ({
                studentId: parseInt(studentId),
                status: data.status,
                notes: data.notes || null
            }));

        if (records.length === 0) {
            showMessage('Please mark at least one student');
            return;
        }

        try {
            await apiCall('/attendance', {
                method: 'POST',
                body: JSON.stringify({ date, sectionId: parseInt(sectionId), records })
            });
            showMessage(`✓ Attendance saved for ${records.length} students`);
        } catch (error) {
            showMessage(`Error: ${error.message}`);
        }
    });

    // Bulk Actions
    document.getElementById('mark-all-present').addEventListener('click', () => {
        if (confirm('Mark all students as Present?')) {
            students.forEach(student => {
                attendanceRecords[student.id] = {
                    ...attendanceRecords[student.id],
                    status: 'Present'
                };
            });
            renderAttendanceGrid();
        }
    });

    document.getElementById('mark-all-absent').addEventListener('click', () => {
        if (confirm('Mark all students as Absent?')) {
            students.forEach(student => {
                attendanceRecords[student.id] = {
                    ...attendanceRecords[student.id],
                    status: 'Absent'
                };
            });
            renderAttendanceGrid();
        }
    });

    // PDF Export
    document.getElementById('download-pdf').addEventListener('click', async () => {
        const sectionId = sectionSelect.value;
        const date = attendanceDate.value;

        if (!sectionId) {
            showMessage('Please select a section');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/attendance/pdf?sectionId=${sectionId}&date=${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_${date}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showMessage('✓ PDF downloaded successfully');
        } catch (error) {
            showMessage(`Error: ${error.message}`);
        }
    });

    // TXT Export
    document.getElementById('download-txt').addEventListener('click', async () => {
        const sectionId = sectionSelect.value;
        const date = attendanceDate.value;

        if (!sectionId) {
            showMessage('Please select a section');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/attendance/download?sectionId=${sectionId}&date=${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to generate report');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_${date}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showMessage('✓ TXT file downloaded successfully');
        } catch (error) {
            showMessage(`Error: ${error.message}`);
        }
    });

    // Notes Modal
    document.getElementById('save-notes').addEventListener('click', () => {
        const notes = document.getElementById('attendance-notes').value.trim();
        if (currentNoteStudentId) {
            attendanceRecords[currentNoteStudentId] = {
                ...attendanceRecords[currentNoteStudentId],
                notes
            };
            renderAttendanceGrid();
        }
        notesModal.classList.add('hidden');
        currentNoteStudentId = null;
    });

    document.getElementById('cancel-notes').addEventListener('click', () => {
        notesModal.classList.add('hidden');
        currentNoteStudentId = null;
    });

    // Section Modal
    addSectionBtn.addEventListener('click', () => {
        document.getElementById('new-section-name').value = '';
        document.getElementById('section-error').classList.add('hidden');
        sectionModal.classList.remove('hidden');
    });

    document.getElementById('save-section').addEventListener('click', async () => {
        const name = document.getElementById('new-section-name').value.trim();
        const errorEl = document.getElementById('section-error');

        if (!name) {
            errorEl.textContent = 'Section name is required';
            errorEl.classList.remove('hidden');
            return;
        }

        try {
            await apiCall('/sections', {
                method: 'POST',
                body: JSON.stringify({ name })
            });
            sectionModal.classList.add('hidden');
            await fetchSections();
            showMessage('✓ Section created successfully');
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        }
    });

    document.getElementById('cancel-section').addEventListener('click', () => {
        sectionModal.classList.add('hidden');
    });

    // Student Modal
    addStudentBtn.addEventListener('click', () => {
        document.getElementById('new-student-name').value = '';
        document.getElementById('student-photo').value = '';
        document.getElementById('student-error').classList.add('hidden');
        studentModal.classList.remove('hidden');
    });

    document.getElementById('save-student').addEventListener('click', async () => {
        const name = document.getElementById('new-student-name').value.trim();
        const sectionId = document.getElementById('new-student-section').value;
        const photoFile = document.getElementById('student-photo').files[0];
        const errorEl = document.getElementById('student-error');

        if (!name || !sectionId) {
            errorEl.textContent = 'Name and section are required';
            errorEl.classList.remove('hidden');
            return;
        }

        try {
            // Create student
            const student = await apiCall('/students', {
                method: 'POST',
                body: JSON.stringify({ name, sectionId: parseInt(sectionId) })
            });

            // Upload photo if provided
            if (photoFile) {
                const formData = new FormData();
                formData.append('photo', photoFile);

                const token = localStorage.getItem('token');
                await fetch(`${API_URL}/students/${student.id}/photo`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            }

            studentModal.classList.add('hidden');
            
            // Refresh if current section matches
            if (sectionSelect.value === sectionId) {
                await fetchStudents(sectionId);
            }
            
            showMessage('✓ Student added successfully');
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        }
    });

    document.getElementById('cancel-student').addEventListener('click', () => {
        studentModal.classList.add('hidden');
    });

    // History View
    document.getElementById('view-history-btn').addEventListener('click', () => {
        dashboardView.classList.add('hidden');
        historyView.classList.remove('hidden');
        loadHistory();
    });

    document.getElementById('back-to-dashboard').addEventListener('click', () => {
        historyView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    document.getElementById('filter-history').addEventListener('click', () => {
        loadHistory();
    });

    const loadHistory = async () => {
        const sectionId = document.getElementById('history-section-select').value;
        const startDate = document.getElementById('history-start-date').value;
        const endDate = document.getElementById('history-end-date').value;

        let url = '/attendance/history?';
        if (sectionId) url += `sectionId=${sectionId}&`;
        if (startDate) url += `startDate=${startDate}&`;
        if (endDate) url += `endDate=${endDate}&`;

        try {
            const history = await apiCall(url);
            renderHistory(history);
        } catch (error) {
            console.error('Error loading history:', error);
            showMessage('Error loading history');
        }
    };

    const renderHistory = (history) => {
        const tbody = document.getElementById('history-list');
        tbody.innerHTML = '';

        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No attendance records found</td></tr>';
            return;
        }

        history.forEach(record => {
            const date = new Date(record.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dateStr = date.toLocaleDateString();

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>${dayName}</td>
                <td>${record.Section ? record.Section.name : 'N/A'}</td>
                <td>${record.Student ? record.Student.name : 'N/A'}</td>
                <td><span class="status-badge status-${record.status.toLowerCase().replace(' ', '-')}">${record.status}</span></td>
                <td>${record.notes || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    };

    // Monthly View
    document.getElementById('monthly-view-btn').addEventListener('click', () => {
        dashboardView.classList.add('hidden');
        monthlyView.classList.remove('hidden');
        
        // Set default month to current
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        document.getElementById('monthly-date').value = monthStr;
    });

    document.getElementById('back-from-monthly').addEventListener('click', () => {
        monthlyView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    document.getElementById('load-monthly').addEventListener('click', async () => {
        const sectionId = document.getElementById('monthly-section-select').value;
        const monthInput = document.getElementById('monthly-date').value;

        if (!sectionId || !monthInput) {
            showMessage('Please select section and month');
            return;
        }

        const [year, month] = monthInput.split('-');

        try {
            const data = await apiCall(`/attendance/monthly?year=${year}&month=${month}&sectionId=${sectionId}`);
            renderMonthlyReport(data);
        } catch (error) {
            console.error('Error loading monthly report:', error);
            showMessage('Error loading monthly report');
        }
    });

    const renderMonthlyReport = (data) => {
        const container = document.getElementById('monthly-report-container');
        
        if (data.students.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-muted);">No data available for this month</p>';
            return;
        }

        let html = `
            <h3 style="margin-bottom: 1.5rem;">Monthly Report - ${data.year}/${data.month}</h3>
            <table class="monthly-table">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Total Days</th>
                        <th>Present</th>
                        <th>Absent</th>
                        <th>Late</th>
                        <th>Excused</th>
                        <th>Attendance %</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.students.forEach(student => {
            const rowClass = student.lowAttendance ? 'low-attendance-row' : '';
            html += `
                <tr class="${rowClass}">
                    <td>
                        ${student.lowAttendance ? '⚠️ ' : ''}
                        ${student.studentName}
                    </td>
                    <td>${student.stats.total}</td>
                    <td>${student.stats.present}</td>
                    <td>${student.stats.absent}</td>
                    <td>${student.stats.latePresent}</td>
                    <td>${student.stats.excused}</td>
                    <td>
                        <strong style="color: ${student.lowAttendance ? 'var(--danger)' : 'var(--success)'}">
                            ${student.percentage}%
                        </strong>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    };

    // Click outside modal to close
    [sectionModal, studentModal, notesModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    // Initialize
    checkAuth();
});
