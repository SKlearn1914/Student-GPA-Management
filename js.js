    const STORAGE_KEY = 'srms_students_v2';
let students = [], selectedId = null;

// DOM Elements
const studentList = document.getElementById('studentList');
const filterInput = document.getElementById('filterInput');
const newStudentBtn = document.getElementById('newStudentBtn');
const mainArea = document.getElementById('mainArea');
const selectedTitle = document.getElementById('selectedTitle');
const selectedMeta = document.getElementById('selectedMeta');
const printBtn = document.getElementById('printBtn');
const deleteStudentBtn = document.getElementById('deleteStudent');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const modalCancel = document.getElementById('modalCancel');
const modalSave = document.getElementById('modalSave');
const exportAll = document.getElementById('exportAll');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const clearAllBtn = document.getElementById('clearAll');

// Presets
const DEPARTMENTS = ['BSCS', 'BSIT', 'BSSE', 'BCE', 'BCA'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];

const PRESET_CS_SUBJECTS = [
    { name: 'Discrete Mathematical Structure', max: 100, credit: 3 },
    { name: 'Data Structures and Algorithms', max: 100, credit: 3 },
    { name: 'LAB: Data Structures and Algorithms', max: 100, credit: 1 },
    { name: 'Multivariate Calculus', max: 100, credit: 3 },
    { name: 'Management Principles', max: 100, credit: 2 },
    { name: 'Computer Organization and Assembly Language', max: 100, credit: 2 },
    { name: 'LAB: Computer Organization and Assembly Language', max: 100, credit: 1 },
    { name: 'HCI and Computer Graphics', max: 100, credit: 2 },
    { name: 'LAB: HCI and Computer Graphics', max: 100, credit: 1 }
];

// Utils
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function timeAgo(d) {
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return 'just now';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
    return d.toLocaleDateString();
}
function saveAll() { localStorage.setItem(STORAGE_KEY, JSON.stringify(students)); }
function load() { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) students = JSON.parse(raw) || []; } catch { students = []; } renderList(); }

// Render Student List
function renderList() {
    const q = (filterInput.value || '').trim().toLowerCase();
    studentList.innerHTML = '';
    const filtered = students.slice().sort((a, b) => b.updated - a.updated).filter(s => {
        if (!q) return true;
        return (s.name || '').toLowerCase().includes(q) || (s.roll || '').toLowerCase().includes(q);
    });
    if (!filtered.length) { studentList.innerHTML = '<div class="muted">No students yet</div>'; return; }
    filtered.forEach(s => {
        const el = document.createElement('div'); el.className = 'stud-item';
        el.innerHTML = `
        <div>
            <div><strong>${escapeHtml(s.name || 'Unnamed')}</strong> <small class="muted">(${escapeHtml(s.roll || '-')})</small></div>
            <div class="muted" style="font-size:12px">Class: ${escapeHtml(s.className || '--')} • ${escapeHtml(s.department || '--')} • Sec ${escapeHtml(s.section || '--')} • Sem ${escapeHtml(s.semester || '--')}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end">
            <div style="font-size:12px;color:var(--muted)">${timeAgo(new Date(s.updated))}</div>
            <div style="margin-top:6px"><button class="btn ghost small" data-id="${s.id}">Open</button></div>
        </div>`;
        el.querySelector('button').onclick = () => selectStudent(s.id);
        studentList.appendChild(el);
    });
}

// Select Student
function selectStudent(id) { selectedId = id; renderMain(); }

// Grade & GPA Calculation
function computeGrade(percent) {
    if (percent >= 90) return "A+";
    if (percent >= 85) return "A";
    if (percent >= 80) return "A-";
    if (percent >= 75) return "B+";
    if (percent >= 70) return "B";
    if (percent >= 66) return "B-";
    if (percent >= 63) return "C+";
    if (percent >= 60) return "C";
    if (percent >= 55) return "C-";
    return "F";
}

function getGradePoint(percent) {
    if (percent >= 90) return 4.00;
    if (percent >= 85) return 3.75;
    if (percent >= 80) return 3.50;
    if (percent >= 75) return 3.25;
    if (percent >= 70) return 3.00;
    if (percent >= 66) return 2.75;
    if (percent >= 63) return 2.50;
    if (percent >= 60) return 2.00;
    if (percent >= 55) return 1.50;
    return 0.00;
}

function computeGPA(subjects) {
    let totalQualityPoints = 0;
    let totalCredits = 0;

    subjects.forEach(sub => {
        const marks = Number(sub.marks) || 0;
        const max = Number(sub.max) || 100;
        const credit = Number(sub.credit) || 0;

        let percent = (marks / max) * 100;
        percent = Math.round(percent);   // ✅ IMPORTANT (University Logic)

        const gp = getGradePoint(percent);

        totalQualityPoints += gp * credit;
        totalCredits += credit;
    });

    return totalCredits
        ? (totalQualityPoints / totalCredits).toFixed(2)
        : "0.00";
}

// Render Main Result
function renderMain() {
    const s = students.find(x => x.id === selectedId);
    if (!s) {
        selectedTitle.textContent = 'Select a student to view / edit';
        selectedMeta.textContent = '';
        mainArea.innerHTML = '<div class="muted">No student selected.</div>';
        return;
    }

    selectedTitle.textContent = s.name;
    selectedMeta.textContent = `Roll: ${s.roll || '-'} • Class: ${s.className || '-'} • ${s.department || '-'} • Sec ${s.section || '-'} • Sem ${s.semester || '-'}`;

    const subjects = s.subjects || [];

    // Calculate weighted totals
    let totalWeightedMarks = 0, totalWeightedMax = 0;
    subjects.forEach(sub => {
        const marks = Number(sub.marks) || 0;
        const max = Number(sub.max) || 100;
        const credit = Number(sub.credit) || 3;

        totalWeightedMarks += marks * credit;
        totalWeightedMax += max * credit;
    });

    const percent = totalWeightedMax ? (totalWeightedMarks / totalWeightedMax) * 100 : 0;
    const grade = computeGrade(percent);
    const gpa = computeGPA(subjects);

    let html = `<div class="card printable" style="padding:12px">
        <h3 style="margin:0">Result Sheet</h3>
        <div class="muted" style="margin-bottom:8px">Generated: ${new Date().toLocaleString()}</div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:12px">
            <div><strong>Name:</strong> ${escapeHtml(s.name)}</div>
            <div><strong>Roll:</strong> ${escapeHtml(s.roll)}</div>
            <div><strong>Class:</strong> ${escapeHtml(s.className)}</div>
            <div><strong>Dept:</strong> ${escapeHtml(s.department)}</div>
            <div><strong>Section:</strong> ${escapeHtml(s.section)}</div>
            <div><strong>Semester:</strong> ${escapeHtml(s.semester)}</div>
        </div>

        <table>
            <thead>
                <tr><th>Subject</th><th>Marks</th><th>Max</th><th>Credit</th><th>Weighted Marks</th><th>%</th></tr>
            </thead>
            <tbody>${subjects.map(sub => {
        const m = Number(sub.marks) || 0;
        const M = Number(sub.max) || 100;
        const c = Number(sub.credit) || 3;
        const weighted = m * c;
        const p = ((weighted / (M * c)) * 100).toFixed(2);
        return `<tr>
                    <td>${escapeHtml(sub.name)}</td>
                    <td>${m}</td>
                    <td>${M}</td>
                    <td>${c}</td>
                    <td>${weighted}</td>
                    <td>${p}%</td>
                </tr>`;
    }).join('')}</tbody>
        </table>

        <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between">
            <div><strong>Total:</strong> ${totalWeightedMarks} / ${totalWeightedMax}</div>
            <div><strong>Percentage:</strong> ${percent.toFixed(2)}%</div>
            <div><strong>Grade:</strong> <span class="grade-pill ${grade}">${grade}</span></div>
            <div><strong>GPA:</strong> ${gpa}</div>
        </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button id="editMarksBtn" class="btn small">Edit Marks</button>
        <button id="editStudentBtn" class="btn ghost small">Edit Student Info</button>
    </div>`;

    mainArea.innerHTML = html;

    document.getElementById('editMarksBtn').onclick = () => openMarksModal(s);
    document.getElementById('editStudentBtn').onclick = () => openStudentModal(s);
}


// Student Modal
function openStudentModal(s) {
    const deptOptions = DEPARTMENTS.map(d => `<option ${s.department === d ? 'selected' : ''}>${d}</option>`).join('');
    const secOptions = SECTIONS.map(d => `<option ${s.section === d ? 'selected' : ''}>${d}</option>`).join('');
    const semOptions = SEMESTERS.map(d => `<option ${s.semester === d ? 'selected' : ''}>${d}</option>`).join('');
    modalContent.innerHTML = `
        <div class="form-grid">
            <input id="stuName" type="text" placeholder="Name" value="${escapeHtml(s.name)}" />
            <input id="stuRoll" type="text" placeholder="Roll No" value="${escapeHtml(s.roll)}" />
            <input id="stuClass" type="text" placeholder="Class Name" value="${escapeHtml(s.className)}" />
            <select id="stuDept">${deptOptions}</select>
            <select id="stuSec">${secOptions}</select>
            <select id="stuSem">${semOptions}</select>
        </div>`;
    modal.style.display = 'flex';
    modalSave.onclick = () => {
        s.name = document.getElementById('stuName').value.trim();
        s.roll = document.getElementById('stuRoll').value.trim();
        s.className = document.getElementById('stuClass').value.trim();
        s.department = document.getElementById('stuDept').value;
        s.section = document.getElementById('stuSec').value;
        s.semester = document.getElementById('stuSem').value;
        s.updated = Date.now();
        saveAll(); renderList(); renderMain(); hideModal();
    };
}

// Marks Modal
function buildSubjectsHtml(subs) {
    return subs.map((sub, i) => `
    <div class="subject-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px" data-i="${i}">
        <input id="sub_${i}_name" type="text" value="${escapeHtml(sub.name)}" style="flex:2" placeholder="Subject Name" />

        <input id="sub_${i}_marks" type="number" min="0"
               value="${sub.marks || 0}" style="width:80px" placeholder="Marks"/>

        <input id="sub_${i}_max" type="number" min="1"
               value="${sub.max || 100}" style="width:80px" placeholder="Max"/>

        <input id="sub_${i}_credit" type="number" min="0"
               value="${sub.credit || 3}" style="width:70px" placeholder="Credit"/>

        <button class="btn ghost small removeSubjectBtn" type="button">
            ❌
        </button>
    </div>
    `).join('');
}
function openMarksModal(s) {

    if (!s.subjects || s.subjects.length === 0)
        s.subjects = PRESET_CS_SUBJECTS.map(x => ({ ...x, marks: 0 }));

    function renderSubjects() {

        modalContent.innerHTML = `
            <div id="marksList">
                ${buildSubjectsHtml(s.subjects)}
            </div>

            <div style="margin-top:15px">
                <button id="addSubjectBtn" class="btn small" type="button">
                    + Add Subject
                </button>
            </div>
        `;

        // Add Subject
        document.getElementById("addSubjectBtn").onclick = () => {

            s.subjects.push({
                name: "",
                marks: 0,
                max: 100,
                credit: 3
            });

            renderSubjects();
        };

        // Remove Subject
        document.querySelectorAll(".removeSubjectBtn").forEach((btn, index) => {

            btn.onclick = () => {

                if (confirm("Remove this subject?")) {

                    s.subjects.splice(index, 1);

                    renderSubjects();
                }
            };
        });
    }

    renderSubjects();

    modal.style.display = "flex";

    modalSave.onclick = () => {

        const rows = document.querySelectorAll(".subject-row");

        const newSubs = [];

        rows.forEach((row, i) => {

            newSubs.push({

                name:
                    row.querySelector(`#sub_${i}_name`).value.trim() ||
                    `Subject ${i + 1}`,

                marks:
                    Number(row.querySelector(`#sub_${i}_marks`).value) || 0,

                max:
                    Number(row.querySelector(`#sub_${i}_max`).value) || 100,

                credit:
                    Number(row.querySelector(`#sub_${i}_credit`).value) || 3
            });

        });

        s.subjects = newSubs;

        s.updated = Date.now();

        saveAll();

        renderMain();

        renderList();

        hideModal();
    };
}
// Modal Hide
function hideModal() { modal.style.display = 'none'; }

// New Student
newStudentBtn.onclick = () => {
    const id = uid();
    const s = { id, name: '', roll: '', className: '', department: 'BSCS', section: 'A', semester: '1', subjects: PRESET_CS_SUBJECTS.map(x => ({ ...x, marks: 0 })), updated: Date.now() };
    students.push(s); saveAll(); renderList(); selectStudent(id); openStudentModal(s);
};

// Cancel
modalCancel.onclick = hideModal;

// Filter
filterInput.oninput = renderList;

// Delete
deleteStudentBtn.onclick = () => {
    if (!selectedId) return;
    if (confirm('Delete student?')) {
        students = students.filter(s => s.id !== selectedId);
        selectedId = null; saveAll(); renderList(); renderMain();
    }
};

// Print
printBtn.onclick = () => {
    const s = students.find(x => x.id === selectedId);
    if (!s) return alert('No student selected');
    const printable = mainArea.querySelector('.printable');
    if (!printable) return alert('Printable area not found');

    const newWin = window.open('', '_blank', 'width=900,height=700');
    newWin.document.write(`
<html>
<head>
<title>Student Result Sheet</title>
<style>
body{font-family:Inter,sans-serif;padding:20px;color:#0f1724;}
table{width:100%;border-collapse:collapse;margin-top:10px;}
th,td{border:1px solid #000;padding:6px;text-align:left;}
h2,h3{text-align:center;}
.grade-pill{padding:4px 6px;border-radius:6px;font-weight:700;display:inline-block;}
.A{background:#d1fae5;color:#065f46;}
.B{background:#dbeafe;color:#1e40af;}
.C{background:#fff7ed;color:#92400e;}
.D{background:#fff1f2;color:#9f1239;}
.F{background:#fdecea;color:#b91c1c;}
div{margin-bottom:6px;}
</style>
</head>
<body>
<h2>Student Result Sheet</h2>
${printable.outerHTML}
</body></html>
    `);
    newWin.document.close();
    newWin.focus();
    newWin.print();
    newWin.close();
};

// Export/Import
exportAll.onclick = () => {
    const dataStr = JSON.stringify(students, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'students.json'; a.click();
    URL.revokeObjectURL(url);
};

importBtn.onclick = () => importFile.click();
importFile.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const imported = JSON.parse(ev.target.result);
            if (Array.isArray(imported)) { students = imported; saveAll(); renderList(); renderMain(); alert('Import successful'); }
        } catch { alert('Invalid file'); }
    };
    reader.readAsText(file);
};

clearAllBtn.onclick = () => { if (confirm('Clear all students?')) { students = []; saveAll(); selectedId = null; renderList(); renderMain(); } };

// Load on start
load();
if (students.length) selectStudent(students.slice().sort((a, b) => b.updated - a.updated)[0].id);
