const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronApi', {
  // Projects
  getProjects:      ()         => ipcRenderer.invoke('get-projects'),
  createProject:    (data)     => ipcRenderer.invoke('create-project', data),
  updateProject:    (id, data) => ipcRenderer.invoke('update-project', id, data),
  deleteProject:    (id)       => ipcRenderer.invoke('delete-project', id),

  // Tasks
  getTasks:         (projectId) => ipcRenderer.invoke('get-tasks', projectId),
  getTask:          (id)        => ipcRenderer.invoke('get-task', id),
  createTask:       (data)      => ipcRenderer.invoke('create-task', data),
  updateTask:       (id, data)  => ipcRenderer.invoke('update-task', id, data),
  deleteTask:       (id)        => ipcRenderer.invoke('delete-task', id),

  // Time Entries
  getTimeEntries:   (filters)              => ipcRenderer.invoke('get-time-entries', filters),
  getActiveTimer:   ()                     => ipcRenderer.invoke('get-active-timer'),
  createTimeEntry:  (data)                 => ipcRenderer.invoke('create-time-entry', data),
  updateTimeEntry:  (id, data)             => ipcRenderer.invoke('update-time-entry', id, data),
  stopTimer:        (id, endTime, duration) => ipcRenderer.invoke('stop-timer', id, endTime, duration),
  deleteTimeEntry:  (id)                   => ipcRenderer.invoke('delete-time-entry', id),

  // Comments
  getComments:      (taskId)    => ipcRenderer.invoke('get-comments', taskId),
  createComment:    (data)      => ipcRenderer.invoke('create-comment', data),
  updateComment:    (id, data)  => ipcRenderer.invoke('update-comment', id, data),
  deleteComment:    (id)        => ipcRenderer.invoke('delete-comment', id),

  // Dashboard & Reports
  getDashboardData: (tzOffset)  => ipcRenderer.invoke('get-dashboard-data', tzOffset),
  getReportData:    (filters)   => ipcRenderer.invoke('get-report-data', filters),
  getOverdueTasks:  ()          => ipcRenderer.invoke('get-overdue-tasks'),

  // PDF
  exportPDF:        ()          => ipcRenderer.invoke('export-pdf'),

  // Calendar
  getCalendarTasks:   ()         => ipcRenderer.invoke('get-calendar-tasks'),
  getTasksSummary:      ()              => ipcRenderer.invoke('get-tasks-summary'),
  getDailySummary:      ()              => ipcRenderer.invoke('get-daily-summary'),
  getDaySchedule:       (date)          => ipcRenderer.invoke('get-day-schedule', date),
  searchAll:            (query)         => ipcRenderer.invoke('search-all', query),
  getTags:              ()              => ipcRenderer.invoke('get-tags'),
  createTag:            (data)          => ipcRenderer.invoke('create-tag', data),
  deleteTag:            (id)            => ipcRenderer.invoke('delete-tag', id),
  getTaskTags:          (taskId)        => ipcRenderer.invoke('get-task-tags', taskId),
  setTaskTags:          (taskId, ids)   => ipcRenderer.invoke('set-task-tags', taskId, ids),
  getHabitData:         ()              => ipcRenderer.invoke('get-habit-data'),
  toggleHabit:          (taskId, date)  => ipcRenderer.invoke('toggle-habit', taskId, date),
  getTemplates:         ()              => ipcRenderer.invoke('get-templates'),
  saveTemplate:         (pid, name)     => ipcRenderer.invoke('save-template', pid, name),
  createFromTemplate:   (tid, data)     => ipcRenderer.invoke('create-from-template', tid, data),
  deleteTemplate:       (id)            => ipcRenderer.invoke('delete-template', id),
  getWeeklyReview:      (tzOffset)      => ipcRenderer.invoke('get-weekly-review', tzOffset),

  // Milestones
  getMilestones:        (projectId) => ipcRenderer.invoke('get-milestones', projectId),
  // Subtasks
  getSubtasks:          (taskId) => ipcRenderer.invoke('get-subtasks', taskId),
  getAllActiveSubtasks:  ()       => ipcRenderer.invoke('get-all-active-subtasks'),
  createSubtask:  (data)         => ipcRenderer.invoke('create-subtask', data),
  toggleSubtask:  (id)           => ipcRenderer.invoke('toggle-subtask', id),
  updateSubtask:  (id, title, estimate) => ipcRenderer.invoke('update-subtask', id, title, estimate),
  deleteSubtask:  (id)           => ipcRenderer.invoke('delete-subtask', id),

  // Settings
  getAllSettings:  ()             => ipcRenderer.invoke('get-all-settings'),
  setSetting:      (key, value)  => ipcRenderer.invoke('set-setting', key, value),

  // CSV
  exportCSV:       (rows, name)  => ipcRenderer.invoke('export-csv', rows, name),

  // Tile drill-downs & chart
  getTodayBreakdown:  ()         => ipcRenderer.invoke('get-today-breakdown'),
  getMonthBreakdown:  ()         => ipcRenderer.invoke('get-month-breakdown'),
  getCompletedTasks:  ()         => ipcRenderer.invoke('get-completed-tasks'),
  getChartData:       (filters)  => ipcRenderer.invoke('get-chart-data', filters),

  // Notes / Journal
  getNote:         (date)           => ipcRenderer.invoke('get-note', date),
  saveNote:        (date, content)  => ipcRenderer.invoke('save-note', date, content),
  getRecentNotes:      ()                   => ipcRenderer.invoke('get-recent-notes'),
  getNoteMonthDates:   (year, month)        => ipcRenderer.invoke('get-note-month-dates', year, month),

  // Time Blocks
  getTimeBlocks:   (date)        => ipcRenderer.invoke('get-time-blocks', date),
  createTimeBlock: (data)        => ipcRenderer.invoke('create-time-block', data),
  updateTimeBlock: (id, data)    => ipcRenderer.invoke('update-time-block', id, data),
  deleteTimeBlock: (id)          => ipcRenderer.invoke('delete-time-block', id),

  // Backup / Restore
  backupDb:   () => ipcRenderer.invoke('backup-db'),
  restoreDb:  () => ipcRenderer.invoke('restore-db'),

  // Monthly review, comparison, diagram
  getMonthlyReview:    ()          => ipcRenderer.invoke('get-monthly-review'),
  getReviewComparison: ()          => ipcRenderer.invoke('get-review-comparison'),
  getProjectDiagram:   (projectId) => ipcRenderer.invoke('get-project-diagram', projectId),
  addDependency:       (taskId, dependsOnId) => ipcRenderer.invoke('add-dependency', taskId, dependsOnId),
  removeDependency:    (taskId, dependsOnId) => ipcRenderer.invoke('remove-dependency', taskId, dependsOnId),

  // 4DX / WIGs
  getWigs:              ()                          => ipcRenderer.invoke('get-wigs'),
  createWig:            (data)                      => ipcRenderer.invoke('create-wig', data),
  updateWig:            (id, data)                  => ipcRenderer.invoke('update-wig', id, data),
  deleteWig:            (id)                        => ipcRenderer.invoke('delete-wig', id),
  getScoreboard:        ()                          => ipcRenderer.invoke('get-scoreboard'),
  saveWigCommitment:    (wigId, weekStart, text)    => ipcRenderer.invoke('save-wig-commitment', wigId, weekStart, text),
  getWeeklyCommitment:  (weekStart)                 => ipcRenderer.invoke('get-weekly-commitment', weekStart),
  saveWeeklyCommitment: (weekStart, text)           => ipcRenderer.invoke('save-weekly-commitment', weekStart, text),

  // Inbox
  getInboxTasks:     ()                   => ipcRenderer.invoke('get-inbox-tasks'),
  processInboxTask:  (taskId, projectId)  => ipcRenderer.invoke('process-inbox-task', taskId, projectId),

  // Daily Intentions
  getDailyIntentions: (date)         => ipcRenderer.invoke('get-daily-intentions', date),
  setDailyIntentions: (date, items)  => ipcRenderer.invoke('set-daily-intentions', date, items),

  // Heatmap & work type
  getProductivityHeatmap: (tzOffset) => ipcRenderer.invoke('get-productivity-heatmap', tzOffset),
  getWorkTypeBreakdown:   (tzOffset) => ipcRenderer.invoke('get-work-type-breakdown', tzOffset),

  // Daily Review
  getDailyReview:  (date)        => ipcRenderer.invoke('get-daily-review', date),
  saveDailyReview: (date, data)  => ipcRenderer.invoke('save-daily-review', date, data),

  // Mobile / PWA
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
})
