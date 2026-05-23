// ==========================================================================
// 1. Master Application State & Dynamic Storage Models
// ==========================================================================
let AppState = {
    schoolYear: "2026-2027",
    currentClass: "1A",
    schoolData: null
};

const defaultDataSkeleton = {
    schoolYear: "2026-2027",
    classes: {
        "1A": { homeroom: "307", teachers: [] },
        "1B": { homeroom: "306", teachers: [] },
        "1C": { homeroom: "305", teachers: [] },
        "1D": { homeroom: "304", teachers: [] },
        "2A": { homeroom: "407", teachers: [] },
        "2B": { homeroom: "406", teachers: [] },
        "2C": { homeroom: "405", teachers: [] },
        "2D": { homeroom: "404", teachers: [] },
        "3A": { homeroom: "507", teachers: [] },
        "3B": { homeroom: "506", teachers: [] },
        "3C": { homeroom: "505", teachers: [] }
    },
    // The Master Teacher Directory Index (Initials -> Data mapping)
    teachersRoster: {},
    subjectsCurriculum: {}
    savedGrids: {}
};

const timeSlots = [
    { label: "08:15-09:00", periodNum: 1 },
    { label: "09:00-09:45", periodNum: 2 },
    { label: "09:45-10:15", isRecess: true },
    { label: "10:15-11:00", periodNum: 3 },
    { label: "11:00-11:45", periodNum: 4 },
    { label: "11:45-12:30", periodNum: 5 },
    { label: "12:30-13:30", isLunch: true },
    { label: "13:30-14:15", periodNum: 6 },
    { label: "14:15-15:00", periodNum: 7 },
    { label: "15:00-15:45", periodNum: 8 }
];

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// ==========================================================================
// 2. Lifecycle System Setup
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    loadDatabaseState();
    setupInterfaceListeners();
    generateDynamicGridRows();
    syncMetadataToUI();
});

function loadDatabaseState() {
    const localCacheKey = `StarlightTimetable_${AppState.schoolYear}`;
    const cachedData = localStorage.getItem(localCacheKey);
    
    if (cachedData) {
        AppState.schoolData = JSON.parse(cachedData);
    } else {
        AppState.schoolData = JSON.parse(JSON.stringify(defaultDataSkeleton));
        persistDatabaseState();
    }
}

function persistDatabaseState() {
    const localCacheKey = `StarlightTimetable_${AppState.schoolYear}`;
    localStorage.setItem(localCacheKey, JSON.stringify(AppState.schoolData));
}

// ==========================================================================
// 3. Interactive Management Event Interceptors
// ==========================================================================
function setupInterfaceListeners(    // Subject Curriculum Registration Actions
    document.getElementById("add-subject-btn").addEventListener("click", () => {
        const grade = document.getElementById("input-sub-grade").value;
        const subName = document.getElementById("input-sub-name").value.trim().toUpperCase();
        const teacherInitials = document.getElementById("input-sub-teacher").value.trim().toUpperCase();
        const periodBudget = document.getElementById("input-sub-periods").value;
        const requiresDouble = document.getElementById("input-sub-double").checked;

        if (!grade || !subName || !teacherInitials || !periodBudget) {
            alert("Please fill out all subject parameter requirements.");
            return;
        }

        // Verify if teacher exists in roster first as a validation check
        if (!AppState.schoolData.teachersRoster[teacherInitials]) {
            alert(`Warning: Teacher with initials "${teacherInitials}" is not registered in the staff roster yet. You can still save this rule, but ensure you register them later.`);
        }

        // Generate a unique tracking key for this subject rule
        const ruleID = `${grade}_${subName}_${teacherInitials}`;
        
        AppState.schoolData.subjectsCurriculum[ruleID] = {
            grade: grade,
            subjectName: subName,
            teacherInitials: teacherInitials,
            totalPeriods: parseInt(periodBudget, 10),
            requiresDouble: requiresDouble
        };

        persistDatabaseState();
        syncMetadataToUI();

        // Reset fields
        document.getElementById("input-sub-name").value = "";
        document.getElementById("input-sub-teacher").value = "";
        document.getElementById("input-sub-periods").value = "";
        document.getElementById("input-sub-double").checked = false;
    });
) {
    // Dropdown structural layout tracking
    const classSelector = document.getElementById("class-view-selector");
    if (classSelector) {
        classSelector.addEventListener("change", (e) => {
            AppState.currentClass = e.target.value;
            syncMetadataToUI();
        });
    }

    // Class Teacher & Homeroom Form Entry Actions
    document.getElementById("save-class-meta-btn").addEventListener("click", () => {
        const currentClassID = AppState.currentClass;
        const hrInput = document.getElementById("input-homeroom").value.trim();
        const ct1Input = document.getElementById("input-ct1").value.trim();
        const ct2Input = document.getElementById("input-ct2").value.trim();

        if (hrInput) AppState.schoolData.classes[currentClassID].homeroom = hrInput;
        
        let compositeTeachers = [];
        if (ct1Input) compositeTeachers.push(ct1Input);
        if (ct2Input) compositeTeachers.push(ct2Input);
        AppState.schoolData.classes[currentClassID].teachers = compositeTeachers;

        persistDatabaseState();
        syncMetadataToUI();
        
        // Clear forms out for efficiency
        document.getElementById("input-homeroom").value = "";
        document.getElementById("input-ct1").value = "";
        document.getElementById("input-ct2").value = "";
    });

    // Teacher Directory Registration Entry Actions
    document.getElementById("add-teacher-btn").addEventListener("click", () => {
        const initials = document.getElementById("input-t-initials").value.trim().toUpperCase();
        const fullName = document.getElementById("input-t-fullname").value.trim();
        const department = document.getElementById("input-t-dept").value;

        if (!initials || !fullName) {
            alert("Please provide both Teacher Initials and Full Name parameters.");
            return;
        }

        // Add or overwrite teacher data in directory cache block
        AppState.schoolData.teachersRoster[initials] = {
            fullName: fullName,
            department: department
        };

        persistDatabaseState();
        syncMetadataToUI();

        // Clear input parameters
        document.getElementById("input-t-initials").value = "";
        document.getElementById("input-t-fullname").value = "";
        document.getElementById("input-t-dept").value = "General";
    });

    document.getElementById("backup-data-btn").addEventListener("click", downloadSystemDataFile);
}

// ==========================================================================
// 4. Matrix Generation & Display Synchronization
// ==========================================================================
function generateDynamicGridRows() {
    const tableBody = document.getElementById("timetable-body-week1");
    if (!tableBody) return;

    timeSlots.forEach(slot => {
        const row = document.createElement("tr");

        if (slot.isRecess) {
            row.className = "break-row";
            row.innerHTML = `<td class="time-col">${slot.label}</td><td colspan="5">Recess</td>`;
            tableBody.appendChild(row);
            return;
        }

        if (slot.isLunch) {
            row.className = "break-row";
            row.innerHTML = `<td class="time-col">${slot.label}</td><td colspan="5">Lunch</td>`;
            tableBody.appendChild(row);
            return;
        }

        let rowHTML = `<td class="time-col">${slot.label}</td>`;

        daysOfWeek.forEach(day => {
            if (day === "Fri" && (slot.periodNum === 7 || slot.periodNum === 8)) {
                if (slot.periodNum === 7) {
                    rowHTML += `<td rowspan="2" class="fixed-activity-cell">Class Activity</td>`;
                }
                return;
            }

            rowHTML += `
                <td class="cell" data-day="${day}" data-period="${slot.periodNum}">
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

function syncMetadataToUI() {
    const currentClassID = AppState.currentClass;
    const classInfo = AppState.schoolData.classes[currentClassID];
    const subCount = Object.keys(AppState.schoolData.subjectsCurriculum || {}).length;
    document.getElementById("subject-count").textContent = subCount;

    if (!classInfo) return;

    // Run layout modifications
    document.getElementById("school-year-val").textContent = AppState.schoolYear;
    document.getElementById("class-id-val").textContent = currentClassID;
    document.getElementById("homeroom-val").textContent = classInfo.homeroom || "None Assigned";
    
    const teachersList = classInfo.teachers || [];
    document.getElementById("class-teacher-val").textContent = teachersList.length > 0 ? teachersList.join(" / ") : "None Assigned";

    // Update staff headcount tally
    const staffCount = Object.keys(AppState.schoolData.teachersRoster).length;
    document.getElementById("staff-count").textContent = staffCount;
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
