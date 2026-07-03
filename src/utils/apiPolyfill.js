/**
 * apiPolyfill.js
 *
 * When Momentum is opened in a regular browser (mobile PWA mode), window.api
 * doesn't exist because the Electron preload script isn't running.
 * This file creates a fetch-based window.api that mirrors every IPC call,
 * routing requests to the Express server running on the Mac.
 *
 * The base URL is automatically derived from window.location.origin — so if
 * the user navigates to http://192.168.1.42:3001, every API call goes there.
 */

if (typeof window !== 'undefined' && !window.api) {
  const BASE = window.location.origin

  const _get  = (url)       => fetch(BASE + url).then(r => r.json())
  const _post = (url, body) => fetch(BASE + url, { method: 'POST',   headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
  const _put  = (url, body) => fetch(BASE + url, { method: 'PUT',    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
  const _del  = (url)       => fetch(BASE + url, { method: 'DELETE' }).then(r => r.json())
  const _na   = ()          => Promise.resolve({ unsupported: true, message: 'Not available on mobile' })
  const _enc  = (obj)       => encodeURIComponent(JSON.stringify(obj || {}))

  window.api = {
    // ── Projects ──────────────────────────────────────────────────────────────
    getProjects:    ()         => _get('/api/projects'),
    createProject:  (data)     => _post('/api/projects', data),
    updateProject:  (id, data) => _put(`/api/projects/${id}`, data),
    deleteProject:  (id)       => _del(`/api/projects/${id}`),

    // ── Tasks ─────────────────────────────────────────────────────────────────
    getTasks:       (projectId) => _get(`/api/tasks?projectId=${projectId}`),
    getTask:        (id)        => _get(`/api/tasks/${id}`),
    createTask:     (data)      => _post('/api/tasks', data),
    updateTask:     (id, data)  => _put(`/api/tasks/${id}`, data),
    deleteTask:     (id)        => _del(`/api/tasks/${id}`),

    // ── Time Entries ──────────────────────────────────────────────────────────
    getTimeEntries:  (filters)               => _get(`/api/time-entries?filters=${_enc(filters)}`),
    getActiveTimer:  ()                      => _get('/api/time-entries/active'),
    createTimeEntry: (data)                  => _post('/api/time-entries', data),
    updateTimeEntry: (id, data)              => _put(`/api/time-entries/${id}`, data),
    stopTimer:       (id, endTime, duration) => _post(`/api/time-entries/${id}/stop`, { endTime, duration }),
    deleteTimeEntry: (id)                    => _del(`/api/time-entries/${id}`),

    // ── Comments ──────────────────────────────────────────────────────────────
    getComments:   (taskId)    => _get(`/api/comments?taskId=${taskId}`),
    createComment: (data)      => _post('/api/comments', data),
    updateComment: (id, data)  => _put(`/api/comments/${id}`, data),
    deleteComment: (id)        => _del(`/api/comments/${id}`),

    // ── Dashboard & Reports ───────────────────────────────────────────────────
    getDashboardData: (tzOffset) => _get(`/api/dashboard?tzOffset=${tzOffset || 0}`),
    getReportData:    (filters)  => _get(`/api/reports?filters=${_enc(filters)}`),
    getOverdueTasks:  ()         => _get('/api/overdue-tasks'),

    // ── Native-only features (not available on mobile) ────────────────────────
    exportPDF: _na,
    exportCSV: _na,
    backupDb:  _na,
    restoreDb: _na,

    // ── Calendar ──────────────────────────────────────────────────────────────
    getCalendarTasks: ()       => _get('/api/calendar-tasks'),
    getTasksSummary:  ()       => _get('/api/tasks/summary'),
    getDailySummary:  ()       => _get('/api/daily-summary'),
    getDaySchedule:   (date)   => _get(`/api/day-schedule?date=${date}`),
    searchAll:        (query)  => _get(`/api/search?q=${encodeURIComponent(query)}`),

    // ── Tags ──────────────────────────────────────────────────────────────────
    getTags:      ()              => _get('/api/tags'),
    createTag:    (data)          => _post('/api/tags', data),
    deleteTag:    (id)            => _del(`/api/tags/${id}`),
    getTaskTags:  (taskId)        => _get(`/api/task-tags?taskId=${taskId}`),
    setTaskTags:  (taskId, ids)   => _put(`/api/task-tags/${taskId}`, { ids }),

    // ── Habits ────────────────────────────────────────────────────────────────
    getHabitData: ()              => _get('/api/habits'),
    toggleHabit:  (taskId, date)  => _post('/api/habits/toggle', { taskId, date }),

    // ── Templates ─────────────────────────────────────────────────────────────
    getTemplates:       ()          => _get('/api/templates'),
    saveTemplate:       (pid, name) => _post('/api/templates', { projectId: pid, name }),
    createFromTemplate: (tid, data) => _post(`/api/templates/${tid}/create`, data),
    deleteTemplate:     (id)        => _del(`/api/templates/${id}`),

    // ── Reviews ───────────────────────────────────────────────────────────────
    getWeeklyReview:    (tzOffset)  => _get(`/api/weekly-review?tzOffset=${tzOffset || 0}`),
    getMonthlyReview:   ()          => _get('/api/monthly-review'),
    getReviewComparison:()          => _get('/api/review-comparison'),
    getProjectDiagram:  (projectId) => _get(`/api/project-diagram?projectId=${projectId}`),
    addDependency:      (taskId, dependsOnId) => _post('/api/dependencies', { taskId, dependsOnId }),
    removeDependency:   (taskId, dependsOnId) => _post('/api/dependencies/remove', { taskId, dependsOnId }),

    // ── Milestones ────────────────────────────────────────────────────────────
    getMilestones: (projectId) => _get(`/api/milestones?projectId=${projectId}`),

    // ── Subtasks ──────────────────────────────────────────────────────────────
    getSubtasks:         (taskId)              => _get(`/api/subtasks?taskId=${taskId}`),
    getAllActiveSubtasks: ()                    => _get('/api/tasks/active-subtasks'),
    createSubtask:       (data)                => _post('/api/subtasks', data),
    toggleSubtask:       (id)                  => _put(`/api/subtasks/${id}/toggle`, {}),
    updateSubtask:       (id, title, estimate) => _put(`/api/subtasks/${id}`, { title, estimate }),
    deleteSubtask:       (id)                  => _del(`/api/subtasks/${id}`),

    // ── Settings ─────────────────────────────────────────────────────────────
    getAllSettings: ()            => _get('/api/settings'),
    setSetting:    (key, value)  => _put(`/api/settings/${encodeURIComponent(key)}`, { value }),

    // ── Notes / Journal ───────────────────────────────────────────────────────
    getNote:          (date)         => _get(`/api/notes/${date}`),
    saveNote:         (date, content)=> _put(`/api/notes/${date}`, { content }),
    getRecentNotes:   ()             => _get('/api/notes/recent'),
    getNoteMonthDates:(year, month)  => _get(`/api/notes/month?year=${year}&month=${month}`),

    // ── Time Blocks ───────────────────────────────────────────────────────────
    getTimeBlocks:  (date)     => _get(`/api/time-blocks?date=${date}`),
    createTimeBlock:(data)     => _post('/api/time-blocks', data),
    updateTimeBlock:(id, data) => _put(`/api/time-blocks/${id}`, data),
    deleteTimeBlock:(id)       => _del(`/api/time-blocks/${id}`),

    // ── Breakdowns / Charts ───────────────────────────────────────────────────
    getTodayBreakdown: () => _get('/api/breakdown/today'),
    getMonthBreakdown: () => _get('/api/breakdown/month'),
    getCompletedTasks: () => _get('/api/completed-tasks'),
    getChartData: (filters) => _get(`/api/chart-data?filters=${_enc(filters)}`),

    // ── WIGs / 4DX ───────────────────────────────────────────────────────────
    getWigs:             ()                       => _get('/api/wigs'),
    createWig:           (data)                   => _post('/api/wigs', data),
    updateWig:           (id, data)               => _put(`/api/wigs/${id}`, data),
    deleteWig:           (id)                     => _del(`/api/wigs/${id}`),
    getScoreboard:       ()                       => _get('/api/scoreboard'),
    saveWigCommitment:   (wigId, weekStart, text) => _post(`/api/wigs/${wigId}/commitment`, { weekStart, text }),
    getWeeklyCommitment: (weekStart)              => _get(`/api/weekly-commitment?weekStart=${weekStart}`),
    saveWeeklyCommitment:(weekStart, text)        => _put('/api/weekly-commitment', { weekStart, text }),

    // ── Inbox ─────────────────────────────────────────────────────────────────
    getInboxTasks:    ()                  => _get('/api/inbox'),
    processInboxTask: (taskId, projectId) => _post(`/api/inbox/${taskId}/process`, { projectId }),

    // ── Daily Intentions ─────────────────────────────────────────────────────
    getDailyIntentions: (date)        => _get(`/api/intentions?date=${date}`),
    setDailyIntentions: (date, items) => _put('/api/intentions', { date, items }),

    // ── Heatmap ───────────────────────────────────────────────────────────────
    getProductivityHeatmap: (tzOffset) => _get(`/api/heatmap?tzOffset=${tzOffset || 0}`),
    getWorkTypeBreakdown:   (tzOffset) => _get(`/api/work-type?tzOffset=${tzOffset || 0}`),

    // ── Daily Review ──────────────────────────────────────────────────────────
    getDailyReview:  (date)       => _get(`/api/daily-review?date=${date}`),
    saveDailyReview: (date, data) => _post('/api/daily-review', { date, data }),

    // ── Server info (PWA: return self) ────────────────────────────────────────
    getServerInfo: () => Promise.resolve({ url: window.location.origin }),
  }
}
