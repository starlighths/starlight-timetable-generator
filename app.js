// ==========================================================================
// 1. Master Application State & Data Structure
// ==========================================================================
let AppState = {
    schoolYear: "2026-2027",
    currentClass: "1A",
    schoolData: null
};

// Default skeleton to bootstrap the 2026-2027 school year database
const defaultDataSkeleton = {
    schoolYear: "2026-2027",
    classes: {
        "1A": { homeroom: "RM101", teachers: ["Mrs. Alice Morgan", "Mr. John Davis"] },
        "1B": { homeroom: "RM102", teachers: ["Mr. Brian Davis"] },
        "1C": { homeroom: "RM103", teachers: ["Ms. Clara Wong"] },
        "1D": { homeroom: "RM104", teachers: ["Mr. David Lee"] },
        "2A": { homeroom: "RM201", teachers: ["Mrs. Emma Watson"] },
        "2B": { homeroom: "RM202", teachers: ["Mr. Frank Castle"] },
        "2C": { homeroom: "RM203", teachers: ["Grace Hopper"] },
        "2D": { homeroom: "RM204", teachers: ["Henry Cavill"] },
        "3A": { homeroom: "RM301", teachers: ["Ian McKellen"] },
        "3B": { homeroom: "RM302", teachers: ["Julia Roberts"] },
        "3C": { homeroom: "RM303", teachers: ["Kevin Bacon"] }
        // Note: 3D is deliberately omitted from active list per requirements
    },
    savedGrids: {}
};

// Defining the time blocks matching the image specifications
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
// 2. Lifecycle Initialization Pipeline
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    loadDatabaseState();
    setupInterfaceListeners();
    generateDynamicGridRows();
    syncMetadataToUI();
});

// Load configuration from local cache storage or establish fresh tracking state
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

// Wire up dropdown selectors to swap data dynamically
function setupInterfaceListeners() {
    const classSelector = document.getElementById("class-view-selector");
    if (classSelector) {
        classSelector.addEventListener("change", (e) => {
            AppState.currentClass = e.target.value;
            syncMetadataToUI();
        });
    }

    const backupBtn = document.getElementById("backup-data-btn");
    if (backupBtn) {
        backupBtn.addEventListener("click", downloadSystemDataFile);
    }
}

// ==========================================================================
// 3. Structural Grid Generation Engine
// ==========================================================================
function generateDynamicGridRows() {
    const tableBody = document.getElementById("timetable-body-week1");
    if (!tableBody) return;

    // Clear any existing dynamic rows first to avoid duplication bugs
    const standardRows = tableBody.querySelectorAll("tr:not(.fixed-row)");
    standardRows.forEach(row => row.remove());

    timeSlots.forEach(slot => {
        const row = document.createElement("tr");

        // 1. Handle special Recess row span
        if (slot.isRecess) {
            row.className = "break-row";
            row.innerHTML = `<td class="time-col">${slot.label}</td><td colspan="5">Recess</td>`;
            tableBody.appendChild(row);
            return;
        }

        // 2. Handle special Lunch row span
        if (slot.isLunch) {
            row.className = "break-row";
            row.innerHTML = `<td class="time-col">${slot.label}</td><td colspan="5">Lunch</td>`;
            tableBody.appendChild(row);
            return;
        }

        // 3. Build typical subject lessons or Friday Activity cells
        let rowHTML = `<td class="time-col">${slot.label}</td>`;

        daysOfWeek.forEach(day => {
            // Check for Friday afternoon Class Activity exceptions (Periods 7 and 8)
            if (day === "Fri" && (slot.periodNum === 7 || slot.periodNum === 8)) {
                if (slot.periodNum === 7) {
                    rowHTML += `<td rowspan="2" class="fixed-activity-cell">Class Activity</td>`;
                }
                return;
            }

            // Normal lesson grid cell with built-in split layout structures
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

// ==========================================================================
// 4. Interface State Synchronization
// ==========================================================================
function syncMetadataToUI() {
    const currentClassID = AppState.currentClass;
    const classInfo = AppState.schoolData.classes[currentClassID];

    if (!classInfo) return;

    // Sync header elements cleanly exactly matching your blueprint layout rules
    document.getElementById("school-year-val").textContent = AppState.schoolYear;
    document.getElementById("class-id-val").textContent = currentClassID;
    document.getElementById("homeroom-val").textContent = classInfo.homeroom || "";
    
    const teachersList = classInfo.teachers || [];
    document.getElementById("class-teacher-val").textContent = teachersList.join(" / ");
}

// Save backup down to a local storage file configuration
function downloadSystemDataFile() {
    const dataString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState.schoolData, null, 2));
    const downloader = document.createElement('a');
    downloader.setAttribute("href", dataString);
    downloader.setAttribute("download", `starlight_backup_${AppState.schoolYear}.json`);
    document.body.appendChild(downloader);
    downloader.click();
    downloader.remove();
}
