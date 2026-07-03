// tursoApi.js — builds a window.api-compatible object backed by Turso.
// Mirrors the exact surface of electron/preload.js; name/argument mapping
// follows the IPC handlers in electron/main.js.
import db from './tursoDb.js'

// Browser CSV download (replaces the Electron save dialog)
function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename || 'momentum-export.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return { success: true }
}

const unsupported = () => Promise.resolve({ unsupported: true, message: 'Not available in cloud mode' })

export function buildTursoApi() {
  return {
    // Projects
    getProjects:   ()         => db.getProjects(),
    createProject: (data)     => db.createProject(data),
    updateProject: (id, data) => db.updateProject(id, data),
    deleteProject: (id)       => db.deleteProject(id),

    // Tasks
    getTasks:   (projectId) => db.getTasksByProject(projectId),
    getTask:    (id)        => db.getTask(id),
    createTask: (data)      => db.createTask(data),
    updateTask: (id, data)  => db.updateTask(id, data),
    deleteTask: (id)        => db.deleteTask(id),

    // Time entries
    getTimeEntries:  (filters)                => db.getTimeEntries(filters),
    getActiveTimer:  ()                       => db.getActiveTimer(),
    createTimeEntry: (data)                   => db.createTimeEntry(data),
    updateTimeEntry: (id, data)               => db.updateTimeEntry(id, data),
    stopTimer:       (id, endTime, duration)  => db.stopTimer(id, endTime, duration),
    deleteTimeEntry: (id)                     => db.deleteTimeEntry(id),

    // Comments
    getComments:   (taskId)   => db.getComments(taskId),
    createComment: (data)     => db.createComment(data),
    updateComment: (id, data) => db.updateComment(id, data),
    deleteComment: (id)       => db.deleteComment(id),

    // Dashboard & reports
    getDashboardData: (tzOffset) => db.getDashboardData(tzOffset),
    getReportData:    (filters)  => db.getReportData(filters),
    getOverdueTasks:  ()         => db.getOverdueTasks(),

    // Electron-only features → graceful no-ops in the browser
    exportPDF: () => { window.print(); return Promise.resolve({ printed: true }) },
    exportCSV: (csv, name) => Promise.resolve(downloadCSV(csv, name)),
    backupDb:  unsupported,
    restoreDb: unsupported,
    getServerInfo: () => Promise.resolve({ url: null, tailscaleUrl: null }),

    // Calendar & misc
    getCalendarTasks: ()       => db.getCalendarTasks(),
    getTasksSummary:  ()       => db.getTasksSummary(),
    getDailySummary:  ()       => db.getDailySummary(),
    getDaySchedule:   (date)   => db.getDaySchedule(date),
    searchAll:        (query)  => db.searchAll(query),

    // Tags
    getTags:     ()             => db.getTags(),
    createTag:   (data)         => db.createTag(data),
    deleteTag:   (id)           => db.deleteTag(id),
    getTaskTags: (taskId)       => db.getTaskTags(taskId),
    setTaskTags: (taskId, ids)  => db.setTaskTags(taskId, ids),

    // Habits
    getHabitData: ()              => db.getHabitData(),
    toggleHabit:  (taskId, date)  => db.toggleHabitCompletion(taskId, date),

    // Templates
    getTemplates:       ()            => db.getTemplates(),
    saveTemplate:       (pid, name)   => db.saveTemplate(pid, name),
    createFromTemplate: (tid, data)   => db.createProjectFromTemplate(tid, data),
    deleteTemplate:     (id)          => db.deleteTemplate(id),

    // Reviews
    getWeeklyReview:     (tzOffset) => db.getWeeklyReview(tzOffset),
    getMonthlyReview:    ()         => db.getMonthlyReview(),
    getReviewComparison: ()         => db.getReviewComparison(),

    // Milestones / subtasks
    getMilestones:        (projectId)          => db.getMilestones(projectId),
    getSubtasks:          (taskId)             => db.getSubtasks(taskId),
    getAllActiveSubtasks: ()                   => db.getAllActiveSubtasks(),
    createSubtask:        (data)               => db.createSubtask(data),
    toggleSubtask:        (id)                 => db.toggleSubtask(id),
    updateSubtask:        (id, title, est)     => db.updateSubtask(id, title, est),
    deleteSubtask:        (id)                 => db.deleteSubtask(id),

    // Settings
    getAllSettings: ()            => db.getAllSettings(),
    setSetting:     (key, value)  => db.setSetting(key, value),

    // Tile drill-downs & chart
    getTodayBreakdown: ()         => db.getTodayBreakdown(),
    getMonthBreakdown: ()         => db.getMonthBreakdown(),
    getCompletedTasks: ()         => db.getCompletedTasks(),
    getChartData:      (filters)  => db.getChartData(filters),

    // Notes / journal
    getNote:           (date)          => db.getNote(date),
    saveNote:          (date, content) => db.saveNote(date, content),
    getRecentNotes:    ()              => db.getRecentNotes(),
    getNoteMonthDates: (year, month)   => db.getNoteMonthDates(year, month),

    // Time blocks
    getTimeBlocks:   (date)     => db.getTimeBlocks(date),
    createTimeBlock: (data)     => db.createTimeBlock(data),
    updateTimeBlock: (id, data) => db.updateTimeBlock(id, data),
    deleteTimeBlock: (id)       => db.deleteTimeBlock(id),

    // Diagram / dependencies
    getProjectDiagram: (projectId)           => db.getProjectDiagram(projectId),
    addDependency:     (taskId, dependsOnId) => db.addDependency(taskId, dependsOnId),
    removeDependency:  (taskId, dependsOnId) => db.removeDependency(taskId, dependsOnId),

    // 4DX / WIGs
    getWigs:              ()                        => db.getWigs(),
    createWig:            (data)                    => db.createWig(data),
    updateWig:            (id, data)                => db.updateWig(id, data),
    deleteWig:            (id)                      => db.deleteWig(id),
    getScoreboard:        ()                        => db.getScoreboardData(),
    saveWigCommitment:    (wigId, weekStart, text)  => db.saveWigCommitment(wigId, weekStart, text),
    getWeeklyCommitment:  (weekStart)               => db.getWeeklyCommitment(weekStart),
    saveWeeklyCommitment: (weekStart, text)         => db.saveWeeklyCommitment(weekStart, text),

    // Inbox
    getInboxTasks:    ()                  => db.getInboxTasks(),
    processInboxTask: (taskId, projectId) => db.processInboxTask(taskId, projectId),

    // Daily intentions / reviews
    getDailyIntentions: (date)        => db.getDailyIntentions(date),
    setDailyIntentions: (date, items) => db.setDailyIntentions(date, items),
    getDailyReview:     (date)        => db.getDailyReview(date),
    saveDailyReview:    (date, data)  => db.saveDailyReview(date, data),

    // Heatmap & work type
    getProductivityHeatmap: (tzOffset) => db.getProductivityHeatmap(tzOffset),
    getWorkTypeBreakdown:   (tzOffset) => db.getWorkTypeBreakdown(tzOffset),
  }
}

export { initSchema } from './tursoDb.js'
