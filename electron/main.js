const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged

// Initialize DB eagerly so it's ready before any IPC calls arrive
const db = require('./database')
const { startApiServer } = require('./api-server')

let serverInfo = { url: null }

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#020617',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function autoBackup() {
  try {
    const dbPath     = path.join(app.getPath('userData'), 'productivity.db')
    const backupDir  = path.join(app.getPath('userData'), 'auto-backups')
    if (!fs.existsSync(dbPath)) return
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    const stamp      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const dest       = path.join(backupDir, `momentum-${stamp}.db`)
    fs.copyFileSync(dbPath, dest)
    // Keep only the 7 most recent auto-backups
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .sort()
    if (files.length > 7) {
      files.slice(0, files.length - 7).forEach(f => fs.unlinkSync(path.join(backupDir, f)))
    }
  } catch (e) {
    console.error('Auto-backup failed:', e.message)
  }
}

app.whenReady().then(async () => {
  autoBackup()
  // Start the local API server (for mobile/PWA access on same WiFi)
  serverInfo = await startApiServer(db)
  createWindow()
  setupIPC()

  // Check for overdue tasks and send OS notification
  app.on('browser-window-focus', () => notifyOverdue())

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function notifyOverdue() {
  try {
    const overdue = db.getOverdueTasks()
    if (overdue.length > 0 && Notification.isSupported()) {
      new Notification({
        title: 'Momentum — Overdue Tasks',
        body: `You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}. Check your board.`,
        silent: false,
      }).show()
    }
  } catch (_) {}
}

function setupIPC() {
  ipcMain.handle('get-projects',       () => db.getProjects())
  ipcMain.handle('create-project',     (_, data) => db.createProject(data))
  ipcMain.handle('update-project',     (_, id, data) => db.updateProject(id, data))
  ipcMain.handle('delete-project',     (_, id) => db.deleteProject(id))

  ipcMain.handle('get-tasks',          (_, projectId) => db.getTasksByProject(projectId))
  ipcMain.handle('get-task',           (_, id) => db.getTask(id))
  ipcMain.handle('create-task',        (_, data) => db.createTask(data))
  ipcMain.handle('update-task',        (_, id, data) => db.updateTask(id, data))
  ipcMain.handle('delete-task',        (_, id) => db.deleteTask(id))

  ipcMain.handle('get-time-entries',   (_, filters) => db.getTimeEntries(filters))
  ipcMain.handle('get-active-timer',   () => db.getActiveTimer())
  ipcMain.handle('create-time-entry',  (_, data) => db.createTimeEntry(data))
  ipcMain.handle('update-time-entry',  (_, id, data) => db.updateTimeEntry(id, data))
  ipcMain.handle('stop-timer',         (_, id, endTime, duration) => db.stopTimer(id, endTime, duration))
  ipcMain.handle('delete-time-entry',  (_, id) => db.deleteTimeEntry(id))

  ipcMain.handle('get-comments',       (_, taskId) => db.getComments(taskId))
  ipcMain.handle('create-comment',     (_, data) => db.createComment(data))
  ipcMain.handle('update-comment',     (_, id, data) => db.updateComment(id, data))
  ipcMain.handle('delete-comment',     (_, id) => db.deleteComment(id))

  ipcMain.handle('get-dashboard-data',   (_, tzOffset) => db.getDashboardData(tzOffset))
  ipcMain.handle('get-report-data',      (_, filters) => db.getReportData(filters))
  ipcMain.handle('get-overdue-tasks',    () => db.getOverdueTasks())
  ipcMain.handle('get-calendar-tasks',   () => db.getCalendarTasks())
  ipcMain.handle('get-tasks-summary',    () => db.getTasksSummary())
  ipcMain.handle('get-daily-summary',   () => db.getDailySummary())
  ipcMain.handle('get-day-schedule',     (_, date) => db.getDaySchedule(date))
  ipcMain.handle('search-all',           (_, query) => db.searchAll(query))
  ipcMain.handle('get-tags',             () => db.getTags())
  ipcMain.handle('create-tag',           (_, data) => db.createTag(data))
  ipcMain.handle('delete-tag',           (_, id) => db.deleteTag(id))
  ipcMain.handle('get-task-tags',        (_, taskId) => db.getTaskTags(taskId))
  ipcMain.handle('set-task-tags',        (_, taskId, tagIds) => db.setTaskTags(taskId, tagIds))
  ipcMain.handle('get-habit-data',       () => db.getHabitData())
  ipcMain.handle('toggle-habit',         (_, taskId, date) => db.toggleHabitCompletion(taskId, date))
  ipcMain.handle('get-templates',        () => db.getTemplates())
  ipcMain.handle('save-template',        (_, projectId, name) => db.saveTemplate(projectId, name))
  ipcMain.handle('create-from-template', (_, templateId, data) => db.createProjectFromTemplate(templateId, data))
  ipcMain.handle('delete-template',      (_, id) => db.deleteTemplate(id))
  ipcMain.handle('get-weekly-review',    (_, tzOffset) => db.getWeeklyReview(tzOffset))

  // Milestones
  ipcMain.handle('get-milestones',       (_, projectId) => db.getMilestones(projectId))
  // Subtasks
  ipcMain.handle('get-subtasks',         (_, taskId) => db.getSubtasks(taskId))
  ipcMain.handle('get-all-active-subtasks', ()        => db.getAllActiveSubtasks())
  ipcMain.handle('create-subtask',  (_, data)   => db.createSubtask(data))
  ipcMain.handle('toggle-subtask',  (_, id)     => db.toggleSubtask(id))
  ipcMain.handle('update-subtask',  (_, id, title, estimate) => db.updateSubtask(id, title, estimate))
  ipcMain.handle('delete-subtask',  (_, id)     => db.deleteSubtask(id))

  // Settings
  ipcMain.handle('get-all-settings', () => db.getAllSettings())
  ipcMain.handle('set-setting',      (_, key, value) => db.setSetting(key, value))

  // Notes / Journal
  ipcMain.handle('get-note',         (_, date)          => db.getNote(date))
  ipcMain.handle('save-note',        (_, date, content) => db.saveNote(date, content))
  ipcMain.handle('get-recent-notes',      ()                       => db.getRecentNotes())
  ipcMain.handle('get-note-month-dates',  (_, year, month)         => db.getNoteMonthDates(year, month))

  // Time Blocks
  ipcMain.handle('get-time-blocks',    (_, date)     => db.getTimeBlocks(date))
  ipcMain.handle('create-time-block',  (_, data)     => db.createTimeBlock(data))
  ipcMain.handle('update-time-block',  (_, id, data) => db.updateTimeBlock(id, data))
  ipcMain.handle('delete-time-block',  (_, id)       => db.deleteTimeBlock(id))

  // Backup / Restore
  ipcMain.handle('backup-db', async () => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Backup',
      defaultPath: `momentum-backup-${new Date().toISOString().split('T')[0]}.db`,
      filters: [{ name: 'Database', extensions: ['db'] }],
    })
    if (!filePath) return { cancelled: true }
    const dbPath = path.join(app.getPath('userData'), 'productivity.db')
    fs.copyFileSync(dbPath, filePath)
    return { filePath }
  })

  ipcMain.handle('restore-db', async () => {
    const { filePaths, cancelled } = await dialog.showOpenDialog(mainWindow, {
      title: 'Restore from Backup',
      filters: [{ name: 'Database', extensions: ['db'] }],
      properties: ['openFile'],
    })
    if (cancelled || !filePaths[0]) return { cancelled: true }
    const dbPath = path.join(app.getPath('userData'), 'productivity.db')
    fs.copyFileSync(filePaths[0], dbPath)
    return { success: true }
  })

  // CSV Export
  ipcMain.handle('export-csv', async (_, rows, filename) => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export CSV',
      defaultPath: filename || `momentum-export-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    })
    if (!filePath) return { cancelled: true }
    fs.writeFileSync(filePath, rows)
    return { filePath }
  })
  ipcMain.handle('get-today-breakdown',   () => db.getTodayBreakdown())
  ipcMain.handle('get-month-breakdown',   () => db.getMonthBreakdown())
  ipcMain.handle('get-completed-tasks',   () => db.getCompletedTasks())
  ipcMain.handle('get-chart-data',        (_, filters) => db.getChartData(filters))
  ipcMain.handle('get-monthly-review',    () => db.getMonthlyReview())
  ipcMain.handle('get-review-comparison', () => db.getReviewComparison())
  ipcMain.handle('get-project-diagram',   (_, projectId) => db.getProjectDiagram(projectId))
  ipcMain.handle('add-dependency',        (_, taskId, dependsOnId) => db.addDependency(taskId, dependsOnId))
  ipcMain.handle('remove-dependency',     (_, taskId, dependsOnId) => db.removeDependency(taskId, dependsOnId))
  ipcMain.handle('get-wigs',              () => db.getWigs())
  ipcMain.handle('create-wig',            (_, data) => db.createWig(data))
  ipcMain.handle('update-wig',            (_, id, data) => db.updateWig(id, data))
  ipcMain.handle('delete-wig',            (_, id) => db.deleteWig(id))
  ipcMain.handle('get-scoreboard',        () => db.getScoreboardData())
  ipcMain.handle('save-wig-commitment',   (_, wigId, weekStart, commitment) => db.saveWigCommitment(wigId, weekStart, commitment))
  ipcMain.handle('get-weekly-commitment', (_, weekStart) => db.getWeeklyCommitment(weekStart))
  ipcMain.handle('save-weekly-commitment',(_, weekStart, commitment) => db.saveWeeklyCommitment(weekStart, commitment))

  // Inbox
  ipcMain.handle('get-inbox-tasks',     () => db.getInboxTasks())
  ipcMain.handle('process-inbox-task',  (_, taskId, projectId) => db.processInboxTask(taskId, projectId))

  // Daily Intentions
  ipcMain.handle('get-daily-intentions', (_, date) => db.getDailyIntentions(date))
  ipcMain.handle('set-daily-intentions', (_, date, items) => db.setDailyIntentions(date, items))

  // Heatmap & work type
  ipcMain.handle('get-productivity-heatmap', (_, tzOffset) => db.getProductivityHeatmap(tzOffset))
  ipcMain.handle('get-work-type-breakdown',  (_, tzOffset) => db.getWorkTypeBreakdown(tzOffset))

  // Daily Review
  ipcMain.handle('get-daily-review',  (_, date) => db.getDailyReview(date))
  ipcMain.handle('save-daily-review', (_, date, data) => db.saveDailyReview(date, data))

  // Mobile / PWA server info
  ipcMain.handle('get-server-info', () => ({ url: serverInfo?.url || null, tailscaleUrl: serverInfo?.tailscaleUrl || null }))

  // Check deadline notifications every minute
  const notified = new Set()
  setInterval(() => {
    try {
      const tasks = db.getUpcomingDeadlines()
      const now = Date.now()
      tasks.forEach(task => {
        if (notified.has(task.id)) return
        const deadline = new Date(`${task.due_date}T${task.due_time}`).getTime()
        const minutesLeft = (deadline - now) / 60000
        if (minutesLeft >= 0 && minutesLeft <= (task.notify_before || 10)) {
          notified.add(task.id)
          if (Notification.isSupported()) {
            new Notification({
              title: 'Momentum — Deadline Soon',
              body: `"${task.title}" is due in ${Math.ceil(minutesLeft)} min · ${task.project_name}`,
              silent: false,
            }).show()
          }
        }
      })
    } catch (_) {}
  }, 60000)

  // PDF export
  ipcMain.handle('export-pdf', async () => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Report as PDF',
      defaultPath: `FlowTrack-Report-${new Date().toISOString().split('T')[0]}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    })
    if (!filePath) return { cancelled: true }

    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: true,
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
    })
    fs.writeFileSync(filePath, pdfData)
    return { filePath }
  })
}
