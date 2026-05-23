// ==========================================================================
// 1. Master Application State Framework
// ==========================================================================
let AppState = {
    schoolYear: "2026-2027",
    currentClass: "1A",
    selectedTokenNode: null, 
    schoolData: null
};

const defaultDataSkeleton = {
    schoolYear: "2026-2027",
    classes: {
        "1A": { teachers: [] }, "1B": { teachers: [] }, "1C": { teachers: [] }, "1D": { teachers: [] },
        "2A": { teachers: [] }, "2B": { teachers: [] }, "2C": { teachers: [] }, "2D": { teachers: [] },
        "3A": { teachers: [] }, "3B": { teachers: [] }, "3C": { teachers: [] }
    },
    teachersRoster: {},
    subjectsCurriculum: {}, 
    savedGrids: {}          
};

const timeSlots = [
    { label: "08:15-09:00", periodNum: 1 }, { label: "09:00-09:45", periodNum: 2 },
    { label: "09:45-10:15", isRecess: true },
    { label: "10:15-11:00", periodNum: 3 }, { label: "11:00-11:45", periodNum: 4 },
    { label: "11:45-12:30", periodNum: 5 },
    { label: "12:30-13:30", isLunch: true },
    { label: "13:30-14:15", periodNum: 6 }, { label: "14:15-15:00", periodNum: 7 },
    { label: "15:00-15:45", periodNum: 8 }
];

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// Official Mapping Matrix with built-in Rules and Meeting requirements
const subjectsMetaIndex = {
    "korean": { short: "Korean", requiresMeeting: true },
    "kf": { short: "KF", requiresMeeting: false },
    "eng": { short: "Eng", requiresMeeting: true },
    "eng(sp)": { short: "Eng(Sp)", requiresMeeting: false },
    "math": { short: "Math", requiresMeeting: true },
    "ih": { short: "IH", requiresMeeting: false, levels: ["Grade 2", "Grade 3"] },
    "sst": { short: "SST", requiresMeeting: true, levels: ["Grade 1"] },
    "hist": { short: "Hist", requiresMeeting: true, levels: ["Grade 1"] },
    "kr.hist": { short: "Kr.Hist", requiresMeeting: true },
    "sci": { short: "Sci", requiresMeeting: true },
    "geog": { short: "Geog", requiresMeeting: true },
    "b&e": { short: "B&E", requiresMeeting: true, levels: ["Grade 1"] },
    "bus": { short: "Bus", requiresMeeting: false, levels: ["Grade 2", "Grade 3"] },
    "music": { short: "Music", requiresMeeting: false },
    "tech": { short: "Tech", requiresMeeting: false },
    "arts": { short: "Arts", requiresMeeting: false },
    "pe": { short: "PE", requiresMeeting: false },
    "dance": { short: "Dance", requiresMeeting: false, elective: true },
    "m&b": { short: "M&B", requiresMeeting: false, elective: true },
    "drama": { short: "Drama", requiresMeeting: false, elective: true },
    "kl": { short: "KL", requiresMeeting: false, elective: true, levels: ["Grade 1"] },
    "el": { short: "EL", requiresMeeting: false, elective: true, levels: ["Grade 1"] }
};

// ==========================================================================
// 2. Automated Smart Room Number Calculation Formula
// ==========================================================================
function calculateRoomNumber(classID) {
    const gradeLetter = classID.charAt(0); // "1", "2", or "3"
    const trackLetter = classID.charAt(1); // "A", "B", "C", or "D"

    let floor = "3"; // S1 Default
    if (gradeLetter === "2") floor = "4"; // S2
    if (gradeLetter === "3") floor = "5"; // S3

    let roomSuffix = "07"; // A Default
    if (trackLetter === "B") roomSuffix = "06";
    if (trackLetter === "C") roomSuffix = "05";
    if (trackLetter === "D") roomSuffix = "04";

    return `${floor}${roomSuffix}`;
}

// ==========================================================================
// 3. System Lifecycle Pipe
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    loadDatabaseState();
    setupInterfaceListeners();
    generateGridStructuralLayout("1");
    generateGridStructuralLayout("2");
    syncMetadataToUI();
});

function loadDatabaseState() {
    const key = `StarlightTimetable_${AppState.schoolYear}`;
    const cached = localStorage.getItem(key);
    if (cached) {
        AppState.schoolData = JSON.parse(cached);
    } else {
        AppState.schoolData = JSON.parse(JSON.stringify(defaultDataSkeleton));
        persistDatabaseState();
    }
}

function persistDatabaseState() {
    const key = `StarlightTimetable_${AppState.schoolYear}`;
    localStorage.setItem(key, JSON.stringify(AppState.schoolData));
}

// ==========================================================================
// 4. Interface Grid Structural Renderer
// ==========================================================================
function generateGridStructuralLayout(wk) {
    const tableBody = document.querySelector(`.timetable-body-target[data-week="${wk}"]`);
    if (!tableBody) return;

    timeSlots.forEach(slot => {
        const row = document.createElement("tr");

        if (slot.isRecess || slot.isLunch) {
            row.className = "break-row";
            row.innerHTML = `<td class="time-col">${slot.label}</td><td colspan="5">${slot.isRecess ? 'Recess' : 'Lunch'}</td>`;
            tableBody.appendChild(row);
            return;
        }

        let rowHTML = `<td class="time-col">${slot.label}</td>`;

        daysOfWeek.forEach(day => {
            if (day === "Fri" && (slot.periodNum === 7 || slot.periodNum === 8)) {
                if (slot.periodNum === 7) rowHTML += `<td rowspan="2" class="fixed-activity-cell">Class Activity</td>`;
                return;
            }

            rowHTML += `
                <td class="cell" data-week="${wk}" data-day="${day}" data-period="${slot.periodNum}">
                    <div class="split-wrapper">
                        <div class="split-left" data-split="left">
                            <span class="room-label"></span>
                            <span class="subject-label"></span>
                            <span class="initials-label"></span>
                        </div>
                        <div class="split-right" data-split="right">
                            <span class="room-label"></span>
                            <span class="subject-label"></span>
                            <span class="initials-label"></span>
                        </div>
                    </div>
                </td>`;
        });

        row.innerHTML = rowHTML;
        tableBody.appendChild(row);
    });
}

// ==========================================================================
// 5. Interface Interaction Handlers
// ==========================================================================
function setupInterfaceListeners() {
    document.getElementById("class-view-selector").addEventListener("change", (e) => {
        AppState.currentClass = e.target.value;
        AppState.selectedTokenNode = null;
        syncMetadataToUI();
    });

    document.getElementById("save-class-meta-btn").addEventListener("click", () => {
        const currentClassID = AppState.currentClass;
        const ct1 = document.getElementById("input-ct1").value.trim().toUpperCase();
        const ct2 = document.getElementById("input-ct2").value.trim().toUpperCase();
        
        let tList = [];
        if (ct1) tList.push(ct1);
        if (ct2) tList.push(ct2);
        
        AppState.schoolData.classes[currentClassID].teachers = tList;
        persistDatabaseState();
        syncMetadataToUI();
        document.getElementById("input-ct1").value = "";
        document.getElementById("input-ct2").value = "";
    });

    document.getElementById("add-teacher-btn").addEventListener("click", () => {
        const initials = document.getElementById("input-t-initials").value.trim().toUpperCase();
        const full = document.getElementById("input-t-fullname").value.trim();
        const dept = document.getElementById("input-t-dept").value;

        if (!initials || !full) return;
        AppState.schoolData.teachersRoster[initials] = { fullName: full, department: dept };
        persistDatabaseState();
        syncMetadataToUI();
        document.getElementById("input-t-initials").value = "";
        document.getElementById("input-t-fullname").value = "";
    });

    document.getElementById("add-subject-btn").addEventListener("click", () => {
        const grade = document.getElementById("input-sub-grade").value;
        const subInput = document.getElementById("input-sub-name").value.trim().toLowerCase();
        const initials = document.getElementById("input-sub-teacher").value.trim().toUpperCase();
        const periods = document.getElementById("input-sub-periods").value;

        if (!grade || !subInput || !initials || !periods) return;

        const subMeta = subjectsMetaIndex[subInput];
        if (!subMeta) {
            alert(`"${subInput.toUpperCase()}" is not in the system's official subject lexicon list.`);
            return;
        }

        if (subMeta.levels && !subMeta.levels.includes(grade)) {
            alert(`Level Restriction Conflict: ${subMeta.short} is restricted from being added to ${grade}.`);
            return;
        }

        const ruleID = `${grade}_${subInput}_${initials}`;
        AppState.schoolData.subjectsCurriculum[ruleID] = {
            grade: grade, subjectKey: subInput, shortForm: subMeta.short, teacherInitials: initials, totalPeriods: parseInt(periods, 10)
        };

        persistDatabaseState();
        syncMetadataToUI();
        document.getElementById("input-sub-name").value = "";
        document.getElementById("input-sub-teacher").value = "";
        document.getElementById("input-sub-periods").value = "";
    });

    // Timetable Assignment Clicking Node Interceptor
    document.getElementById("timetable-print-canvas").addEventListener("click", (e) => {
        const targetSplit = e.target.closest(".split-left, .split-right");
        if (!targetSplit) return;

        const targetCell = targetSplit.closest(".cell");
        const wk = targetCell.dataset.week;
        const dy = targetCell.dataset.day;
        const pd = targetCell.dataset.period;
        const sp = targetSplit.dataset.split;
        const allocationKey = `${AppState.currentClass}_W${wk}_${dy}_P${pd}_${sp}`;

        // Eraser Clear Mode Execution Check
        if (!AppState.selectedTokenNode && AppState.schoolData.savedGrids[allocationKey]) {
            delete AppState.schoolData.savedGrids[allocationKey];
            persistDatabaseState();
            syncMetadataToUI();
            return;
        }

        // Standard Token Placement Operation
        if (!AppState.selectedTokenNode) return;

        AppState.schoolData.savedGrids[allocationKey] = {
            subjectKey: AppState.selectedTokenNode.dataset.subkey,
            shortForm: AppState.selectedTokenNode.dataset.short,
            teacherInitials: AppState.selectedTokenNode.dataset.teacher,
            ruleID: AppState.selectedTokenNode.dataset.ruleid,
            tokenIndex: AppState.selectedTokenNode.dataset.tokenindex
        };

        persistDatabaseState();
        AppState.selectedTokenNode = null; 
        syncMetadataToUI();
    });

    document.getElementById("wipe-data-btn").addEventListener("click", () => {
        if (confirm("Are you sure you want to delete all teachers, subjects, and timetables completely?")) {
            AppState.schoolData = JSON.parse(JSON.stringify(defaultDataSkeleton));
            persistDatabaseState();
            syncMetadataToUI();
        }
    });

    document.getElementById("backup-data-btn").addEventListener("click", downloadSystemDataFile);
}

// ==========================================================================
// 6. Global Synchronization Engine
// ==========================================================================
function syncMetadataToUI() {
    const cls = AppState.currentClass;
    const info = AppState.schoolData.classes[cls];
    const computedRoom = calculateRoomNumber(cls);

    document.querySelectorAll(".school-year-val").forEach(el => el.textContent = AppState.schoolYear);
    document.querySelectorAll(".class-id-val").forEach(el => el.textContent = cls);
    document.querySelectorAll(".homeroom-val").forEach(el => el.textContent = `RM${computedRoom}`);
    document.querySelectorAll(".class-teacher-val").forEach(el => el.textContent = info.teachers.length > 0 ? info.teachers.join(" / ") : "None Assigned");

    document.getElementById("staff-count").textContent = Object.keys(AppState.schoolData.teachersRoster).length;
    document.getElementById("subject-count").textContent = Object.keys(AppState.schoolData.subjectsCurriculum).length;

    let normalizedGrade = "Grade 1";
    if (["2A","2B","2C","2D"].includes(cls)) normalizedGrade = "Grade 2";
    if (["3A","3B","3C"].includes(cls)) normalizedGrade = "Grade 3";

    // Rebuild Unassigned Dock tokens
    const dock = document.getElementById("dock-slots-target");
    dock.innerHTML = "";
    const activeAllocations = Object.values(AppState.schoolData.savedGrids);

    Object.entries(AppState.schoolData.subjectsCurriculum).forEach(([ruleID, rule]) => {
        if (rule.grade !== normalizedGrade) return;

        for (let i = 0; i < rule.totalPeriods; i++) {
            const isAllocated = activeAllocations.some(a => a.ruleID === ruleID && parseInt(a.tokenIndex,10) === i);
            if (!isAllocated) {
                const token = document.createElement("div");
                token.className = "lesson-token";
                token.dataset.ruleid = ruleID;
                token.dataset.subkey = rule.subjectKey;
                token.dataset.short = rule.shortForm;
                token.dataset.teacher = rule.teacherInitials;
                token.dataset.tokenindex = i;
                token.textContent = `${rule.shortForm} (${rule.teacherInitials})`;
                
                token.addEventListener("click", (e) => {
                    e.stopPropagation();
                    document.querySelectorAll(".lesson-token").forEach(t => t.classList.remove("selected-token"));
                    AppState.selectedTokenNode = token;
                    token.classList.add("selected-token");
                });
                dock.appendChild(token);
            }
        }
    });

    // Clear cells before repainting memory values
    document.querySelectorAll(".cell .split-left, .cell .split-right").forEach(n => {
        n.querySelector(".room-label").textContent = "";
        n.querySelector(".subject-label").textContent = "";
        n.querySelector(".initials-label").textContent = "";
    });

    Object.entries(AppState.schoolData.savedGrids).forEach(([key, data]) => {
        if (!key.startsWith(`${cls}_`)) return;
        const parts = key.split("_");
        const wk = parts[1].replace("W","");
        const dy = parts[2];
        const pd = parts[3].replace("P","");
        const sp = parts[4];

        const match = document.querySelector(`.cell[data-week="${wk}"][data-day="${dy}"][data-period="${pd}"]`);
        if (match) {
            const splitNode = match.querySelector(`[data-split="${sp}"]`);
            if (splitNode) {
                splitNode.querySelector(".room-label").textContent = computedRoom;
                splitNode.querySelector(".subject-label").textContent = data.shortForm;
                splitNode.querySelector(".initials-label").textContent = data.teacherInitials;
            }
        }
    });
}

function downloadSystemDataFile() {
    const dataString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState.schoolData, null, 2));
    const downloader = document.createElement('a');
    downloader.setAttribute("href", dataString);
    downloader.setAttribute("download", `starlight_backup_${AppState.schoolYear}.json`);
    document.body.appendChild(downloader);
    downloader.click();
    downloader.remove();
}