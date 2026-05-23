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
    subjectsCurriculum: {}, // Budget rules per individual class
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

// // Official Mapping Matrix with structural grouping and layout specifications
const subjectsMetaIndex = {
    "korean": { short: "Korean", requiresMeeting: true, isGrouped: false },
    "kf": { short: "KF", requiresMeeting: false, isGrouped: true }, // Splits with language groups
    "eng": { short: "Eng", requiresMeeting: true, isGrouped: true }, // Cross-class block splits
    "eng(sp)": { short: "Eng(Sp)", requiresMeeting: false, isGrouped: true },
    "math": { short: "Math", requiresMeeting: true, isGrouped: true }, // Cross-class block splits
    "ih": { short: "IH", requiresMeeting: false, isGrouped: false, floors: ["2", "3"] },
    "sst": { short: "SST", requiresMeeting: true, isGrouped: false, floors: ["1"] },
    "hist": { short: "Hist", requiresMeeting: true, isGrouped: false, floors: ["1"] },
    "kr.hist": { short: "Kr.Hist", requiresMeeting: true, isGrouped: false },
    "sci": { short: "Sci", requiresMeeting: true, isGrouped: false },
    "geog": { short: "Geog", requiresMeeting: true, isGrouped: false },
    "b&e": { short: "B&E", requiresMeeting: true, isGrouped: false, floors: ["1"] },
    "bus": { short: "Bus", requiresMeeting: false, isGrouped: false, floors: ["2", "3"] },
    "music": { short: "Music", requiresMeeting: false, isGrouped: false },
    "tech": { short: "Tech", requiresMeeting: false, isGrouped: false },
    "arts": { short: "Arts", requiresMeeting: false, isGrouped: false },
    "pe": { short: "PE", requiresMeeting: false, isGrouped: false },
    "dance": { short: "Dance", requiresMeeting: false, isGrouped: true, elective: true },
    "m&b": { short: "M&B", requiresMeeting: false, isGrouped: true, elective: true },
    "drama": { short: "Drama", requiresMeeting: false, isGrouped: true, elective: true },
    "kl": { short: "KL", requiresMeeting: false, isGrouped: true, elective: true, floors: ["1"] },
    "el": { short: "EL", requiresMeeting: false, isGrouped: true, elective: true, floors: ["1"] }
};

// Hardcoded cross-classed block band definitions
const crossClassBands = [
    { level: "Grade 1", classes: ["1C", "1D"], subjects: ["eng", "math"] },
    { level: "Grade 2", classes: ["2C", "2D"], subjects: ["eng", "math"] }
];

// ==========================================================================
// 2. Automated Smart Room Number Calculation Formula
// ==========================================================================
function calculateRoomNumber(classID) {
    const gradeLetter = classID.charAt(0); // "1", "2", or "3"
    const trackLetter = classID.charAt(1); // "A", "B", "C", or "D"

    let floor = "3"; 
    if (gradeLetter === "2") floor = "4"; 
    if (gradeLetter === "3") floor = "5"; 

    let roomSuffix = "07"; 
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
        const ct1 = document.getElementById("input-ct1").value.trim();
        const ct2 = document.getElementById("input-ct2").value.trim();
        
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
        let full = document.getElementById("input-t-fullname").value.trim();
        const dept = document.getElementById("input-t-dept").value;

        if (!initials) return;
        if (!full) full = initials; // Fallback to initials if full name input is blank

        AppState.schoolData.teachersRoster[initials] = { fullName: full, department: dept };
        persistDatabaseState();
        syncMetadataToUI();
        document.getElementById("input-t-initials").value = "";
        document.getElementById("input-t-fullname").value = "";
    });

    document.getElementById("add-subject-btn").addEventListener("click", () => {
        const targetClass = document.getElementById("input-sub-grade").value; // e.g., "1A"
        const subInput = document.getElementById("input-sub-name").value.trim().toLowerCase();
        const initials = document.getElementById("input-sub-teacher").value.trim().toUpperCase();
        const periods = document.getElementById("input-sub-periods").value;

        if (!targetClass || !subInput || !initials || !periods) return;

        const subMeta = subjectsMetaIndex[subInput];
        if (!subMeta) {
            alert(`"${subInput.toUpperCase()}" is not an official system subject code.`);
            return;
        }

        // Check floor constraints using the class prefix number (1, 2, or 3)
        const classFloorPrefix = targetClass.charAt(0);
        if (subMeta.floors && !subMeta.floors.includes(classFloorPrefix)) {
            alert(`Tier Restriction Conflict: ${subMeta.short} cannot be assigned to an S${classFloorPrefix} Class (${targetClass}).`);
            return;
        }

        // Unique tracking key bound directly to the exact target class (e.g., 1A_math_TH)
        const ruleID = `${targetClass}_${subInput}_${initials}`;
        AppState.schoolData.subjectsCurriculum[ruleID] = {
            targetClass: targetClass, subjectKey: subInput, shortForm: subMeta.short, teacherInitials: initials, totalPeriods: parseInt(periods, 10)
        };

        persistDatabaseState();
        syncMetadataToUI();
        document.getElementById("input-sub-name").value = "";
        document.getElementById("input-sub-teacher").value = "";
        document.getElementById("input-sub-periods").value = "";
    });

    // Timetable Assignment Clicking Node Interceptor (Handles Full-Width Merging & Cross-Class Banding)
    document.getElementById("timetable-print-canvas").addEventListener("click", (e) => {
        const targetSplit = e.target.closest(".split-left, .split-right");
        if (!targetSplit) return;

        const targetCell = targetSplit.closest(".cell");
        const wk = targetCell.dataset.week;
        const dy = targetCell.dataset.day;
        const pd = targetCell.dataset.period;
        const sp = targetSplit.dataset.split;
        const allocationKey = `${AppState.currentClass}_W${wk}_${dy}_P${pd}_${sp}`;

        // Eraser Clear Mode Execution
        if (!AppState.selectedTokenNode && AppState.schoolData.savedGrids[allocationKey]) {
            const dataToWipe = AppState.schoolData.savedGrids[allocationKey];
            
            // If it was a cross-classed subject or non-grouped subject, find and clean linked nodes too
            Object.keys(AppState.schoolData.savedGrids).forEach(key => {
                if (key.includes(`_W${wk}_${dy}_P${pd}_`)) {
                    const match = AppState.schoolData.savedGrids[key];
                    if (match.ruleID === dataToWipe.ruleID) {
                        delete AppState.schoolData.savedGrids[key];
                    }
                }
            });

            persistDatabaseState();
            syncMetadataToUI();
            return;
        }

        if (!AppState.selectedTokenNode) return;

        const subKey = AppState.selectedTokenNode.dataset.subkey;
        const shortForm = AppState.selectedTokenNode.dataset.short;
        const teacherInitials = AppState.selectedTokenNode.dataset.teacher;
        const ruleId = AppState.selectedTokenNode.dataset.ruleid;
        const tokenIndex = AppState.selectedTokenNode.dataset.tokenindex;
        const subMeta = subjectsMetaIndex[subKey];

        // --- TEACHER CONFLICT CHECK ENGINE ---
        let conflictDetected = false;
        let conflictingClass = "";
        Object.entries(AppState.schoolData.savedGrids).forEach(([exKey, exData]) => {
            if (exKey.includes(`_W${wk}_${dy}_P${pd}_${sp}`) && exData.teacherInitials === teacherInitials) {
                conflictDetected = true;
                conflictingClass = exKey.split("_")[0];
            }
        });

        if (conflictDetected) {
            alert(`🚫 Teacher Conflict! ${teacherInitials} is already teaching Class ${conflictingClass} at this period.`);
            return;
        }

        // --- DETERMINING ALLOCATION BOUNDS ---
        let targetClassesToFill = [AppState.currentClass];
        
        // Find if this subject belongs to a cross-class block link (e.g., 1C & 1D Eng)
        const activeBand = crossClassBands.find(band => 
            band.classes.includes(AppState.currentClass) && band.subjects.includes(subKey)
        );

        if (activeBand) {
            targetClassesToFill = activeBand.classes; // Fill both 1C and 1D simultaneously!
        }

        // Save layout configuration to database maps
        targetClassesToFill.forEach(cls => {
            if (subMeta && subMeta.isGrouped === false) {
                // Non-Grouped items fill BOTH left and right split options completely
                AppState.schoolData.savedGrids[`${cls}_W${wk}_${dy}_P${pd}_left`] = {
                    subjectKey: subKey, shortForm: shortForm, teacherInitials: teacherInitials, ruleID: ruleId, tokenIndex: tokenIndex
                };
                AppState.schoolData.savedGrids[`${cls}_W${wk}_${dy}_P${pd}_right`] = {
                    subjectKey: subKey, shortForm: shortForm, teacherInitials: teacherInitials, ruleID: ruleId, tokenIndex: tokenIndex
                };
            } else {
                // Grouped items fill just the specific targeted left or right half grid column split selected
                AppState.schoolData.savedGrids[`${cls}_W${wk}_${dy}_P${pd}_${sp}`] = {
                    subjectKey: subKey, shortForm: shortForm, teacherInitials: teacherInitials, ruleID: ruleId, tokenIndex: tokenIndex
                };
            }
        });

        persistDatabaseState();
        AppState.selectedTokenNode = null; 
        syncMetadataToUI();
    });
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
        if (confirm("Are you sure you want to completely clear the database layout parameters?")) {
            AppState.schoolData = JSON.parse(JSON.stringify(defaultDataSkeleton));
            persistDatabaseState();
            syncMetadataToUI();
        }
    });

    document.getElementById("backup-data-btn").addEventListener("downloadSystemDataFile", downloadSystemDataFile);
    const backupBtn = document.getElementById("backup-data-btn");
    if (backupBtn) backupBtn.addEventListener("click", downloadSystemDataFile);
}

// ==========================================================================
// 6. Global Synchronization Engine
// ==========================================================================
function syncMetadataToUI() {
    const cls = AppState.currentClass;
    const info = AppState.schoolData.classes[cls];
    const computedRoom = calculateRoomNumber(cls);

    document.querySelectorAll(".school-year-val").forEach(el => el.textContent = AppState.schoolYear);
    document.querySelectorAll(".class-id-val").forEach(el => el.textContent = `Class ${cls}`);
    document.querySelectorAll(".homeroom-val").forEach(el => el.textContent = `RM${computedRoom}`);
    document.querySelectorAll(".class-teacher-val").forEach(el => el.textContent = info.teachers.length > 0 ? info.teachers.join(" / ") : "None Assigned");

    document.getElementById("staff-count").textContent = Object.keys(AppState.schoolData.teachersRoster).length;
    document.getElementById("subject-count").textContent = Object.keys(AppState.schoolData.subjectsCurriculum).length;

    // Rebuild Unassigned Dock tokens tightly matched to this specific classroom class ID
    const dock = document.getElementById("dock-slots-target");
    dock.innerHTML = "";
    const activeAllocations = Object.values(AppState.schoolData.savedGrids);

    Object.entries(AppState.schoolData.subjectsCurriculum).forEach(([ruleID, rule]) => {
        if (rule.targetClass !== cls) return; // Only extract budgets assigned explicitly to this exact class

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