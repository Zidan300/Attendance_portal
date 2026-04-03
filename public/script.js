document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.location.origin + '/api';
    
    // State
    let currentSection = null;
    let students = [];
    let attendanceRecords = {}; // studentId -> status
    let sections = [];

    // Pages
    const pages = {
        login: document.getElementById('loginPage'),
        section: document.getElementById('sectionPage'),
        attendance: document.getElementById('attendancePage')
    };

    // Elements - Login
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    // Elements - Section Selection
    const sectionsGrid = document.getElementById('sectionsGrid');
    const createSectionForm = document.getElementById('createSectionForm');
    const newSectionNameInput = document.getElementById('newSectionName');
    const logoutBtn = document.getElementById('logoutBtn');

    // Elements - Attendance
    const backToSections = document.getElementById('backToSections');
    const currentSectionName = document.getElementById('currentSectionName');
    const attendanceDateInput = document.getElementById('attendanceDate');
    const studentList = document.getElementById('studentList');
    const submitAttendanceBtn = document.getElementById('submitAttendance');
    const downloadTxtBtn = document.getElementById('downloadTxt');
    const downloadPdfBtn = document.getElementById('downloadPdf');
    const settingsBtn = document.getElementById('settingsBtn');
    const toggleEditorBtn = document.getElementById('toggleEditorBtn');

    // Editor Mode Elements
    const editorMode = document.getElementById('editorMode');
    const attendanceMode = document.getElementById('attendanceMode');
    const editorInputList = document.getElementById('editorInputList');
    const addInputRowBtn = document.getElementById('addInputRowBtn');
    const saveStudentsBtn = document.getElementById('saveStudentsBtn');

    // Elements - Stats
    const totalStudentsEl = document.getElementById('totalStudents');
    const presentCountEl = document.getElementById('presentCount');
    const absentCountEl = document.getElementById('absentCount');
    const lateCountEl = document.getElementById('lateCount');
    const attendancePercentageEl = document.getElementById('attendancePercentage');

    // Elements - Modal
    const editorModal = document.getElementById('editorModal');
    const closeModal = document.querySelector('.close-modal');
    const renameSectionForm = document.getElementById('renameSectionForm');
    const renameSectionInput = document.getElementById('renameSectionInput');
    const addStudentForm = document.getElementById('addStudentForm');
    const newStudentNameInput = document.getElementById('newStudentName');
    const studentListEditor = document.getElementById('studentListEditor');
    const deleteSectionBtn = document.getElementById('deleteSectionBtn');

    // Initialize Date
    attendanceDateInput.value = new Date().toISOString().split('T')[0];

    // --- Helper Functions ---

    const showPage = (pageName) => {
        Object.values(pages).forEach(p => p.classList.remove('active'));
        pages[pageName].classList.add('active');
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

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            showPage('login');
            return;
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || data.error || 'API Error');
        return data;
    };

    const updateStats = () => {
        const total = students.length;
        let present = 0, absent = 0, late = 0;

        students.forEach(student => {
            const status = attendanceRecords[student.id];
            if (status === 'Present') present++;
            else if (status === 'Absent') absent++;
            else if (status === 'Late Present') late++;
        });

        totalStudentsEl.textContent = total;
        presentCountEl.textContent = present;
        absentCountEl.textContent = absent;
        lateCountEl.textContent = late;
        
        const percentage = total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0;
        attendancePercentageEl.textContent = percentage + '%';
    };

    // --- Authentication ---

    const checkAuth = () => {
        const token = localStorage.getItem('token');
        if (token) {
            loadSections();
        } else {
            showPage('login');
        }
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
            loadSections();
        } catch (error) {
            loginError.textContent = error.message;
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showPage('login');
    });

    // --- Editor Mode Functions ---

    toggleEditorBtn.addEventListener('click', () => {
        if (editorMode.style.display === 'none') {
            enterEditorMode();
        } else {
            exitEditorMode();
        }
    });

    const enterEditorMode = () => {
        editorMode.style.display = 'block';
        attendanceMode.style.display = 'none';
        toggleEditorBtn.textContent = '📊 Attendance Mode';
        
        // Populate with existing students or empty rows
        editorInputList.innerHTML = '';
        if (students.length > 0) {
            students.forEach(s => addEditorRow(s.name));
        } else {
            for (let i = 0; i < 5; i++) addEditorRow();
        }
    };

    const exitEditorMode = () => {
        editorMode.style.display = 'none';
        attendanceMode.style.display = 'block';
        toggleEditorBtn.textContent = '📝 Edit Students';
    };

    const addEditorRow = (name = '') => {
        const row = document.createElement('div');
        row.className = 'editor-input-row';
        row.innerHTML = `
            <input type="text" class="student-name-input" placeholder="Enter student name" value="${name}">
            <button class="btn-remove-row">&times;</button>
        `;
        row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
        editorInputList.appendChild(row);
    };

    addInputRowBtn.addEventListener('click', () => addEditorRow());

    saveStudentsBtn.addEventListener('click', async () => {
        const inputs = Array.from(document.querySelectorAll('.student-name-input'));
        const names = inputs.map(i => i.value.trim()).filter(n => n !== '');

        if (names.length === 0) {
            alert('Please enter at least one student name.');
            return;
        }

        try {
            // Bulk sync logic
            const currentStudents = await apiCall(`/students?sectionId=${currentSection.id}`);
            
            // Add new
            for (const name of names) {
                if (!currentStudents.find(s => s.name === name)) {
                    await apiCall('/students', {
                        method: 'POST',
                        body: JSON.stringify({ name, sectionId: currentSection.id })
                    });
                }
            }
            
            // Delete removed
            for (const s of currentStudents) {
                if (!names.includes(s.name)) {
                    await apiCall(`/students/${s.id}`, { method: 'DELETE' });
                }
            }

            alert('Student list updated and saved!');
            exitEditorMode();
            loadAttendanceData();
        } catch (error) {
            alert('Error saving student list: ' + error.message);
        }
    });

    // --- Section Management ---

    const loadSections = async () => {
        try {
            sections = await apiCall('/sections');
            renderSections();
            showPage('section');
        } catch (error) {
            console.error('Error loading sections:', error);
        }
    };

    const renderSections = () => {
        sectionsGrid.innerHTML = sections.map(section => `
            <div class="section-card" data-id="${section.id}">
                <h3>${section.name}</h3>
                <p>Click to mark attendance</p>
            </div>
        `).join('');

        document.querySelectorAll('.section-card').forEach(card => {
            card.addEventListener('click', () => {
                const sectionId = card.dataset.id;
                selectSection(sectionId);
            });
        });
    };

    createSectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = newSectionNameInput.value.trim();
        if (!name) return;

        try {
            await apiCall('/sections', {
                method: 'POST',
                body: JSON.stringify({ name })
            });
            newSectionNameInput.value = '';
            loadSections();
        } catch (error) {
            alert(error.message);
        }
    });

    const selectSection = async (sectionId) => {
        try {
            currentSection = sections.find(s => s.id == sectionId);
            if (!currentSection) {
                // Fetch section if not in memory (e.g., direct refresh)
                currentSection = await apiCall(`/sections/${sectionId}`);
            }
            currentSectionName.textContent = currentSection.name;
            await loadAttendanceData();
            showPage('attendance');
        } catch (error) {
            alert('Error selecting section: ' + error.message);
        }
    };

    // --- Attendance Management ---

    const loadAttendanceData = async () => {
        try {
            const date = attendanceDateInput.value;
            // Load students with historical stats
            students = await apiCall(`/students?sectionId=${currentSection.id}&includeStats=true`);
            
            // Load records for this date
            const records = await apiCall(`/attendance/date?date=${date}&sectionId=${currentSection.id}`);
            
            attendanceRecords = {};
            records.forEach(rec => {
                attendanceRecords[rec.StudentId] = rec.status;
            });

            renderStudents();
            updateStats();
        } catch (error) {
            console.error('Error loading attendance data:', error);
        }
    };

    const renderStudents = () => {
        if (students.length === 0) {
            studentList.innerHTML = '<div class="empty-state">No students found. Use settings to add students.</div>';
            return;
        }

        studentList.innerHTML = students.map(student => {
            const status = attendanceRecords[student.id] || '';
            const histPerc = student.stats ? student.stats.percentage : 'N/A';
            return `
                <div class="student-row">
                    <div class="student-info">
                        <div class="student-name">${student.name}</div>
                        <div class="student-history">Total: ${histPerc}%</div>
                    </div>
                    <div class="attendance-buttons">
                        <button class="btn-status ${status === 'Present' ? 'active-present' : ''}" 
                                data-id="${student.id}" data-status="Present">Present</button>
                        <button class="btn-status ${status === 'Absent' ? 'active-absent' : ''}" 
                                data-id="${student.id}" data-status="Absent">Absent</button>
                        <button class="btn-status ${status === 'Late Present' ? 'active-late' : ''}" 
                                data-id="${student.id}" data-status="Late Present">Late</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for status buttons
        document.querySelectorAll('.btn-status').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const status = btn.dataset.status;

                // Toggle logic
                if (attendanceRecords[id] === status) {
                    delete attendanceRecords[id];
                } else {
                    attendanceRecords[id] = status;
                }

                renderStudents(); // Re-render to update classes
                updateStats();
            });
        });
    };

    attendanceDateInput.addEventListener('change', loadAttendanceData);

    submitAttendanceBtn.addEventListener('click', async () => {
        const date = attendanceDateInput.value;
        const records = Object.entries(attendanceRecords).map(([studentId, status]) => ({
            studentId: parseInt(studentId),
            status
        }));

        if (records.length === 0) {
            alert('Please mark at least one student.');
            return;
        }

        try {
            await apiCall('/attendance', {
                method: 'POST',
                body: JSON.stringify({ 
                    date, 
                    sectionId: currentSection.id, 
                    records 
                })
            });
            alert('Attendance saved successfully!');
        } catch (error) {
            alert('Error saving attendance: ' + error.message);
        }
    });

    backToSections.addEventListener('click', () => {
        loadSections();
    });

    // --- Export ---

    const downloadFile = async (format) => {
        const date = attendanceDateInput.value;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/attendance/download/${format}?date=${date}&sectionId=${currentSection.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_${currentSection.name}_${date}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            alert(error.message);
        }
    };

    downloadTxtBtn.addEventListener('click', () => downloadFile('txt'));
    downloadPdfBtn.addEventListener('click', () => downloadFile('pdf'));

    // --- Settings / Editor Modal ---

    settingsBtn.addEventListener('click', () => {
        renameSectionInput.value = currentSection.name;
        editorModal.classList.add('active');
    });

    closeModal.addEventListener('click', () => {
        editorModal.classList.remove('active');
        loadAttendanceData(); // Refresh list after potential changes
    });

    window.addEventListener('click', (e) => {
        if (e.target === editorModal) {
            editorModal.classList.remove('active');
            loadAttendanceData();
        }
    });

    renameSectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = renameSectionInput.value.trim();
        if (!newName || newName === currentSection.name) return;

        try {
            const updated = await apiCall(`/sections/${currentSection.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: newName })
            });
            currentSection.name = updated.name;
            currentSectionName.textContent = updated.name;
            alert('Section renamed successfully');
        } catch (error) {
            alert(error.message);
        }
    });

    deleteSectionBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this entire section? This cannot be undone.')) {
            try {
                await apiCall(`/sections/${currentSection.id}`, { method: 'DELETE' });
                editorModal.classList.remove('active');
                loadSections();
            } catch (error) {
                alert(error.message);
            }
        }
    });

    // Initialize
    checkAuth();
});
