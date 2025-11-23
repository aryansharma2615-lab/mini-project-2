// ====== Global state ======
let courses = [];        // all Course objects
let filteredCourses = []; // after filters/sorting
let selectedCourseId = null;

// ====== Course class ======
class Course {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.department = data.department;
    this.level = data.level;
    this.credits = data.credits;
    this.instructor = data.instructor; // can be null
    this.description = data.description;
    this.semester = data.semester;
  }

  get instructorOrTBA() {
    return this.instructor || "TBA";
  }

  // Normalized semester value so we can sort properly
  get semesterNumeric() {
    // e.g., "Fall 2026"
    if (!this.semester) return 0;
    const parts = this.semester.trim().split(/\s+/);
    if (parts.length !== 2) return 0;

    const season = parts[0];
    const year = parseInt(parts[1], 10) || 0;

    const order = {
      "Winter": 1,
      "Spring": 2,
      "Summer": 3,
      "Fall": 4
    };

    const seasonValue = order[season] || 0;

    // year * 10 + seasonValue keeps correct order
    return year * 10 + seasonValue;
  }

  toDetailsHTML() {
    return `
      <h2>${this.id}</h2>
      <p><strong>Title:</strong> ${this.title}</p>
      <p><strong>Department:</strong> ${this.department}</p>
      <p><strong>Level:</strong> ${this.level}</p>
      <p><strong>Credits:</strong> ${this.credits}</p>
      <p><strong>Instructor:</strong> ${this.instructorOrTBA}</p>
      <p><strong>Semester:</strong> ${this.semester}</p>
      <p>${this.description}</p>
    `;
  }
}

// ====== DOM elements ======
const fileInput = document.getElementById("fileInput");
const fileNameSpan = document.getElementById("fileName");
const errorMessage = document.getElementById("errorMessage");

const departmentFilter = document.getElementById("departmentFilter");
const levelFilter = document.getElementById("levelFilter");
const creditsFilter = document.getElementById("creditsFilter");
const instructorFilter = document.getElementById("instructorFilter");
const sortSelect = document.getElementById("sortSelect");

const courseListDiv = document.getElementById("courseList");
const courseDetailsDiv = document.getElementById("courseDetails");

// ====== File loading ======
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  fileNameSpan.textContent = file.name;
  errorMessage.textContent = "";

  const reader = new FileReader();

  reader.onerror = () => {
    showError("Could not read file.");
  };

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!Array.isArray(data)) {
        throw new Error("JSON is not an array.");
      }

      // Basic structure check
      courses = data.map(obj => {
        if (!obj.id || !obj.title || !obj.department) {
          throw new Error("JSON missing required fields.");
        }
        return new Course(obj);
      });

      selectedCourseId = null;
      setupFilters();
      applyFiltersAndRender();
      courseDetailsDiv.innerHTML = "<p>Select a course to see details.</p>";

    } catch (e) {
      console.error(e);
      showError("Invalid JSON file format.");
      courses = [];
      filteredCourses = [];
      renderCourseList();
      courseDetailsDiv.innerHTML = "<p>No courses loaded.</p>";
    }
  };

  reader.readAsText(file);
});

// ====== Error helper ======
function showError(message) {
  errorMessage.textContent = message;
}

// ====== Filter + sort setup ======
function setupFilters() {
  // get unique values
  const departments = new Set();
  const levels = new Set();
  const credits = new Set();
  const instructors = new Set();

  courses.forEach(c => {
    departments.add(c.department);
    levels.add(c.level);
    credits.add(c.credits);
    if (c.instructor) {
      instructors.add(c.instructor);
    }
  });

  populateSelect(departmentFilter, departments, true);
  populateSelect(levelFilter, levels, true);
  populateSelect(creditsFilter, credits, true);
  populateSelect(instructorFilter, instructors, true);
}

function populateSelect(selectElem, valuesSet, includeAll) {
  const currentValue = selectElem.value || "All";
  selectElem.innerHTML = "";

  if (includeAll) {
    const optAll = document.createElement("option");
    optAll.value = "All";
    optAll.textContent = "All";
    selectElem.appendChild(optAll);
  }

  // sort values nicely
  const values = Array.from(valuesSet);
  values.sort((a, b) => {
    if (typeof a === "number" && typeof b === "number") {
      return a - b;
    }
    return String(a).localeCompare(String(b));
  });

  values.forEach(val => {
    const opt = document.createElement("option");
    opt.value = String(val);
    opt.textContent = String(val);
    selectElem.appendChild(opt);
  });

  // keep previous selection if still valid
  if ([...selectElem.options].some(o => o.value === currentValue)) {
    selectElem.value = currentValue;
  }
}

// ====== Apply filters + sorting ======
function applyFiltersAndRender() {
  if (!Array.isArray(courses) || courses.length === 0) {
    filteredCourses = [];
    renderCourseList();
    return;
  }

  const deptVal = departmentFilter.value;
  const levelVal = levelFilter.value;
  const creditsVal = creditsFilter.value;
  const instrVal = instructorFilter.value;
  const sortVal = sortSelect.value;

  // Use filter() as required
  filteredCourses = courses.filter(c => {
    const deptOK = (deptVal === "All") || (c.department === deptVal);
    const levelOK = (levelVal === "All") || (String(c.level) === levelVal);
    const creditsOK = (creditsVal === "All") || (String(c.credits) === creditsVal);
    const instrOK = (instrVal === "All") || (c.instructor === instrVal);
    return deptOK && levelOK && creditsOK && instrOK;
  });

  // Sorting
  if (sortVal !== "none") {
    filteredCourses.sort((a, b) => {
      switch (sortVal) {
        case "id-asc":
          return a.id.localeCompare(b.id);
        case "id-desc":
          return b.id.localeCompare(a.id);
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "semester-asc":
          return a.semesterNumeric - b.semesterNumeric;
        case "semester-desc":
          return b.semesterNumeric - a.semesterNumeric;
        default:
          return 0;
      }
    });
  }

  renderCourseList();
}

// ====== Render course list ======
function renderCourseList() {
  courseListDiv.innerHTML = "";

  if (filteredCourses.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No courses to display.";
    p.style.padding = "10px";
    courseListDiv.appendChild(p);
    return;
  }

  filteredCourses.forEach(course => {
    const div = document.createElement("div");
    div.className = "course-item";
    div.textContent = course.id;
    div.dataset.courseId = course.id;

    if (course.id === selectedCourseId) {
      div.classList.add("selected");
    }

    div.addEventListener("click", () => {
      selectedCourseId = course.id;
      showCourseDetails(course);
      // update selected highlight
      document
        .querySelectorAll(".course-item")
        .forEach(item => item.classList.remove("selected"));
      div.classList.add("selected");
    });

    courseListDiv.appendChild(div);
  });
}

// ====== Show course details ======
function showCourseDetails(course) {
  courseDetailsDiv.innerHTML = course.toDetailsHTML();
}

// ====== Listeners for filters/sort ======
[departmentFilter, levelFilter, creditsFilter, instructorFilter, sortSelect]
  .forEach(elem => {
    elem.addEventListener("change", () => {
      applyFiltersAndRender();
    });
  });

// ====== Optional: auto-load courses.json in dev (comment out if not allowed) ======
// If your prof wants ONLY manual file upload, leave this part commented.
// You can ignore this block for submission.
// (No automatic fetch needed according to the README.)
