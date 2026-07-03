# Momentum — Product Summary

**Momentum** is a macOS desktop productivity tracker built with Electron + React + SQLite.

---

## Core Features

### Projects & Tasks
- Create projects with a name, color, and description
- Kanban board view per project (To Do / In Progress / Done / Blocked columns)
- Task cards with title, icon, status, priority, start/due dates + times, recurrence, estimate, and notifications
- Subtasks per task
- Edit, delete (with undo toast), and drag between columns
- Archive/unarchive projects

### Time Tracking
- Start/stop/pause timer on any task from anywhere in the app
- Timer pill in the top bar — shows running task with elapsed time, clickable to open that task's detail panel
- Junk entries under 10 seconds are auto-discarded
- Time entries visible in the task detail panel with undo-delete support
- Focus Mode (Pomodoro) synced with the main timer

### Dashboard
- "Today at a Glance" hero card — overdue/due today/in-progress tasks with one-tap timer start
- Stat tiles: time today, time this month, tasks completed, active projects (each drills into a modal)
- Time chart with Day / Week / Month / Custom range
- Active Tasks list with inline timer, priority/status badges, countdown alerts
- Time Goals (daily/weekly hour targets with progress bars)
- Side panel: toggle between **Project Pulse** (per-project health — completion %, today's time, overdue badges) and **Upcoming Deadlines** (next 7 days across all projects)
- Habit Tracker

### Project Diagram
- Visual mind-map style tree: root project node → task nodes → subtask nodes
- Task nodes use solid status colors (slate = todo, blue = in progress, red = blocked, green = done)
- Pan + zoom, click-to-inspect, progress bars per node

### Calendar
- Month, week, and day views
- Time entries rendered as blocks with overlap layout algorithm
- Day view filters out sub-60s junk entries

### Journal
- Daily markdown entries with live preview
- Monthly calendar sidebar with entry-presence dots

### Weekly Review
- Per-project time breakdown for the week
- Timezone-aware (no off-by-one day bugs)

### Reports
- Detailed time log with filtering

### Settings
- Daily/weekly hour goals
- Notification preferences
- Light/dark theme toggle

---

## Technical Notes

| Detail | Value |
|--------|-------|
| Stack | Electron 29, React 18, SQLite (better-sqlite3), Tailwind CSS, Recharts |
| Platform | macOS (arm64 primary) |
| Install | `release/Momentum-1.0.0-arm64.dmg` |
| Theme | Custom CSS token system (`--th-*` vars) for dark/light mode |
| Timer state | Lives in `AppContext` with pause/resume and cross-component sync |
| Timezone | All SQL queries pass a `tzOffset` from the frontend so day boundaries are always local time |
