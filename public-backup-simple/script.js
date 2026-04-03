document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.location.origin + '/api';
    
    // Elements
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const userName = document.getElementById('user-name');
    const attendanceDate = document.getElementById('attendance-date');
    const studentTbody = document.getElementById('student-tbody');
    const newStudentInput = document.getElementById('new-student-name');
    const messageDiv = document.getElementById('message');

    // State
    let students = [];
    let attendanceRecords = {};
    const DEFAULT_SECTION_ID = 1;

    // Initialize
    attendanceDate.value = new Date().toISOString().split('T')[0];

    // Helper Functions
    const showMessage = (text, duration = 3000) => {
        messageDiv.textContent = text;
        messageDiv.classList.remove('hidden');
        setTimeout(() => messageDiv.classList.add('hidden'), duration);
    };

    const apiCall = async (endpoint, options = {}) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || data.error);
        return data;
    };

    const updateStats = () => {
        const total = students.length;
        let present = 0, absent = 0, late = 0;

        Object.values(attendanceRecords).forEach(status => {
            if (status === 'Present') present++;
            else if (status === 'Absent') absent++;
            else if (status === 'Late Present') late++;
        });

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-present').textContent = present;
        document.getElementById('stat-absent').textContent = absent;
        document.getElementById('stat-late').textContent = late;
        
        const percentage = total > 0 ? ((present + late) / total * 100).toFixed(1) : 0;
        document.getElementById('stat-percentage').textContent = percentage + '%';
    };

    // Authentication
    const checkAuth = () => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        
        if (token && user) {
            showDashboard(user);
        } else {
            showLogin();
        }
    };

    const showLogin = () => {
        loginView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
    };

    const showDashboard = (user) => {
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        userName.textContent = user.username;
        loadStudents();
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const data = await apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showDashboard(data.user);
        } catch (error) {
            const errorEl = document.getElementById('login-error');
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showLogin();
    });

    // Load Students
    const loadStudents = async () => {
        try {
            students = await apiCall('/students');
            await loadExistingAttendance();
            renderStudents();
            updateStats();
        } catch (error) {
            console.error('Error loading students:', error);
            showMessage('Error loading students');
        }
    };

    const loadExistingAttendance = async () => {
        try {
            const date = attendanceDate.value;
            const records = await apiCall(`/attendance/date?date=${date}&sectionId=${DEFAULT_SECTION_ID}`);
            
            attendanceRecords = {};
            records.forEach(record => {
                attendanceRecords[record.StudentId] = record.status;
            });
        } catch (error) {
            attendanceRecords = {};
        }
    };

    const renderStudents = () => {
        if (students.length === 0) {
            studentTbody.innerHTML = `
                <tr>
                    <td colspan="3" class="empty-state">
                        <p>No students added yet</p>
                        <p>Type a name in the box above to add students</p>
                    </td>
                </tr>
            `;
            return;
        }

        studentTbody.innerHTML = students.map((student, index) => {
            const status = attendanceRecords[student.id] || '';
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${student.name}</td>
                    <td class="action-col">
                        <div class="attendance-buttons">
                            <button class="btn-attendance present ${status === 'Present' ? 'active' : ''}" 
                                    data-student-id="${student.id}" data-status="Present">
                                Present
                            </button>
                            <button class="btn-attendance absent ${status === 'Absent' ? 'active' : ''}" 
                                    data-student-id="${student.id}" data-status="Absent">
                                Absent
                            </button>
                            <button class="btn-attendance late ${status === 'Late Present' ? 'active' : ''}" 
                                    data-student-id="${student.id}" data-status="Late Present">
                                Late Present
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners
        document.querySelectorAll('.btn-attendance').forEach(btn => {
            btn.addEventListener('click', () => {
                const studentId = parseInt(btn.dataset.studentId);
                const status = btn.dataset.status;
                
                // Remove active from siblings
                btn.parentElement.querySelectorAll('.btn-attendance').forEach(b => {
                    b.classList.remove('active');
                });
                
                // Toggle active
                if (attendanceRecords[studentId] === status) {
                    delete attendanceRecords[studentId];
                } else {
                    btn.classList.add('active');
                    attendanceRecords[studentId] = status;
                }
                
                updateStats();
            });
        });
    };

    // Add Student
    newStudentInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter' && newStudentInput.value.trim()) {
            try {
                const name = newStudentInput.value.trim();
                const student = await apiCall('/students', {
                    method: 'POST',
                    body: JSON.stringify({ name, sectionId: DEFAULT_SECTION_ID })
                });

                students.push(student);
                newStudentInput.value = '';
                renderStudents();
                updateStats();
                showMessage(`✓ ${name} added successfully`);
            } catch (error) {
                showMessage(`Error: ${error.message}`);
            }
        }
    });

    // Submit Attendance
    document.getElementById('submit-attendance').addEventListener('click', async () => {
        const date = attendanceDate.value;
        const records = Object.entries(attendanceRecords).map(([studentId, status]) => ({
            studentId: parseInt(studentId),
            status
        }));

        if (records.length === 0) {
            showMessage('Please mark at least one student');
            return;
        }

        try {
            await apiCall('/attendance', {
                method: 'POST',
                body: JSON.stringify({ date, sectionId: DEFAULT_SECTION_ID, records })
            });
            showMessage(`✓ Attendance saved for ${records.length} students`);
        } catch (error) {
            showMessage(`Error: ${error.message}`);
        }
    });

    // Download TXT
    document.getElementById('download-txt').addEventListener('click', async () => {
        const date = attendanceDate.value;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_URL}/attendance/download/txt?date=${date}&sectionId=${DEFAULT_SECTION_ID}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (!response.ok) throw new Error('Failed to generate report');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_${date}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showMessage('✓ TXT downloaded successfully');
        } catch (error) {
            showMessage(`Error: ${error.message}`);
        }
    });

    // Download PDF
    document.getElementById('download-pdf').addEventListener('click', async () => {
        const date = attendanceDate.value;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_URL}/attendance/download/pdf?date=${date}&sectionId=${DEFAULT_SECTION_ID}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (!response.ok) throw new Error('Failed to generate PDF');

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

    // Date change
    attendanceDate.addEventListener('change', () => {
        loadStudents();
    });

    // Initialize
    checkAuth();
});
