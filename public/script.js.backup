document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const loginForm = document.getElementById('login-form');
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const historyView = document.getElementById('history-view');
    const sectionSelect = document.getElementById('section-select');
    const attendanceDate = document.getElementById('attendance-date');
    const studentList = document.getElementById('student-list');
    const currentTimeDisplay = document.getElementById('current-time');
    const authHeader = document.getElementById('auth-header');
    const usernameDisplay = document.getElementById('username-display');
    const logoutBtn = document.getElementById('logout-btn');
    const dashboardMsg = document.getElementById('dashboard-msg');

    // Modals
    const sectionModal = document.getElementById('section-modal');
    const studentModal = document.getElementById('student-modal');
    const addSectionBtn = document.getElementById('add-section-btn');
    const addStudentBtn = document.getElementById('add-student-btn');

    let students = [];
    let attendanceRecords = {}; // studentId: status
    let currentSections = [];

    // Initialize
    const today = new Date().toISOString().split('T')[0];
    attendanceDate.value = today;

    const updateClock = () => {
        const now = new Date();
        currentTimeDisplay.innerHTML = `<i class="far fa-clock"></i> ${now.toLocaleString()}`;
    };
    setInterval(updateClock, 1000);
    updateClock();

    // --- Auth ---
    const checkAuth = () => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        if (token && user) {
            showDashboard(user.username);
        } else {
            showLogin();
        }
    };

    const showLogin = () => {
        loginView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
        historyView.classList.add('hidden');
        authHeader.classList.add('hidden');
    };

    const showDashboard = (username) => {
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        historyView.classList.add('hidden');
        authHeader.classList.remove('hidden');
        usernameDisplay.textContent = `User: ${username}`;
        fetchSections();
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                showDashboard(data.user.username);
            } else {
                const err = document.getElementById('login-error');
                err.textContent = data.message;
                err.classList.remove('hidden');
            }
        } catch (err) { console.error(err); }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showLogin();
    });

    // --- Data Fetching ---
    const fetchSections = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/sections', { headers: { 'Authorization': `Bearer ${token}` } });
        currentSections = await res.json();
        renderSectionSelects();
    };

    const renderSectionSelects = () => {
        const selects = [sectionSelect, document.getElementById('new-student-section')];
        selects.forEach(s => {
            const val = s.value;
            s.innerHTML = s.id === 'section-select' ? '<option value="">Select Section</option>' : '';
            currentSections.forEach(sec => {
                const opt = document.createElement('option');
                opt.value = sec.id;
                opt.textContent = sec.name;
                s.appendChild(opt);
            });
            s.value = val;
        });
    };

    sectionSelect.addEventListener('change', async () => {
        const sectionId = sectionSelect.value;
        if (!sectionId) {
            studentList.innerHTML = '';
            return;
        }
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/students?sectionId=${sectionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        students = await res.json();
        attendanceRecords = {};
        renderStudents();
    });

    const renderStudents = () => {
        studentList.innerHTML = '';
        students.forEach(student => {
            const tr = document.createElement('tr');
            
            const nameTd = document.createElement('td');
            nameTd.innerHTML = `<strong>${student.name}</strong>`;
            
            const statusTd = document.createElement('td');
            const status = attendanceRecords[student.id] || 'Not Marked';
            const badgeClass = `status-${status.toLowerCase().replace(' ', '-')}`;
            statusTd.innerHTML = `<span class="status-badge ${badgeClass}">${status}</span>`;
            
            const actionTd = document.createElement('td');
            actionTd.className = 'text-right';
            const markingDiv = document.createElement('div');
            markingDiv.className = 'marking-buttons';
            
            const createBtn = (label, type, code) => {
                const btn = document.createElement('button');
                btn.textContent = label;
                btn.className = `btn-toggle ${code} ${status === type ? 'active' : ''}`;
                btn.onclick = () => {
                    attendanceRecords[student.id] = type;
                    renderStudents();
                };
                return btn;
            };

            markingDiv.appendChild(createBtn('P', 'Present', 'p'));
            markingDiv.appendChild(createBtn('L', 'Late Present', 'l'));
            markingDiv.appendChild(createBtn('A', 'Absent', 'a'));
            
            actionTd.appendChild(markingDiv);
            tr.appendChild(nameTd);
            tr.appendChild(statusTd);
            tr.appendChild(actionTd);
            studentList.appendChild(tr);
        });
    };

    // --- Submissions ---
    document.getElementById('submit-attendance').onclick = async () => {
        const sectionId = sectionSelect.value;
        const date = attendanceDate.value;
        if (!sectionId) return showMessage('Select a section first', 'error');
        
        const records = Object.keys(attendanceRecords).map(id => ({
            studentId: parseInt(id),
            status: attendanceRecords[id]
        }));

        const token = localStorage.getItem('token');
        const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ date, records, sectionId })
        });

        if (res.ok) showMessage('Attendance saved successfully!', 'success');
    };

    document.getElementById('download-report').onclick = async () => {
        const sectionId = sectionSelect.value;
        const date = attendanceDate.value;
        if (!sectionId) return showMessage('Select a section first', 'error');
        
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/attendance/download?date=${date}&sectionId=${sectionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 404) return showMessage('No records found for this date/section', 'error');
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const contentDisposition = res.headers.get('Content-Disposition');
        let filename = `attendance_${date}.txt`;
        if (contentDisposition) {
            const m = contentDisposition.match(/filename="(.+)"/);
            if (m) filename = m[1];
        }
        a.download = filename;
        a.click();
    };

    // --- Modal Logic ---
    addSectionBtn.onclick = () => sectionModal.classList.remove('hidden');
    document.getElementById('cancel-section').onclick = () => sectionModal.classList.add('hidden');
    document.getElementById('save-section').onclick = async () => {
        const name = document.getElementById('new-section-name').value;
        const token = localStorage.getItem('token');
        const res = await fetch('/api/sections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name })
        });
        if (res.ok) {
            await fetchSections();
            sectionModal.classList.add('hidden');
            document.getElementById('new-section-name').value = '';
            showMessage('Section created', 'success');
        }
    };

    addStudentBtn.onclick = () => studentModal.classList.remove('hidden');
    document.getElementById('cancel-student').onclick = () => studentModal.classList.add('hidden');
    document.getElementById('save-student').onclick = async () => {
        const name = document.getElementById('new-student-name').value;
        const sectionId = document.getElementById('new-student-section').value;
        const token = localStorage.getItem('token');
        const res = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, sectionId })
        });
        if (res.ok) {
            studentModal.classList.add('hidden');
            document.getElementById('new-student-name').value = '';
            if (sectionSelect.value === sectionId) sectionSelect.dispatchEvent(new Event('change'));
            showMessage('Student added', 'success');
        }
    };

    // --- History ---
    document.getElementById('view-history-btn').onclick = async () => {
        dashboardView.classList.add('hidden');
        historyView.classList.remove('hidden');
        const token = localStorage.getItem('token');
        const res = await fetch('/api/attendance/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const history = await res.json();
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        history.forEach(h => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${h.date}</td>
                <td>${h.Section ? h.Section.name : '-'}</td>
                <td>${h.Student.name}</td>
                <td><span class="status-badge status-${h.status.toLowerCase().replace(' ', '-')}">${h.status}</span></td>
            `;
            list.appendChild(tr);
        });
    };

    document.getElementById('back-to-dashboard').onclick = () => {
        historyView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    };

    const showMessage = (text, type) => {
        dashboardMsg.textContent = text;
        dashboardMsg.className = `msg ${type}`;
        dashboardMsg.classList.remove('hidden');
        setTimeout(() => dashboardMsg.classList.add('hidden'), 3000);
    };

    checkAuth();
});
