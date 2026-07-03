import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'

const AppContext = createContext(null)

const initialState = {
  projects: [],
  overdueTasks: [],
  currentView: 'dashboard',
  currentProject: null,
  currentTask: null,
  activeTimer: null,
  timerSeconds: 0,
  timerOffset: 0,   // accumulated seconds from previous sessions (for pause/resume continuity)
  timerPaused: false,
  pausedTask: null,
  theme: 'dark',
  loading: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload }
    case 'SET_OVERDUE_TASKS':
      return { ...state, overdueTasks: action.payload }
    case 'SET_VIEW':
      return { ...state, currentView: action.payload, currentTask: null, currentProject: null }
    case 'SET_PROJECT':
      return { ...state, currentProject: action.payload, currentView: 'project', currentTask: null }
    case 'SET_TASK':
      return { ...state, currentTask: action.payload }
    case 'SET_ACTIVE_TIMER': {
      const offset = action.offset || 0
      return {
        ...state,
        activeTimer: action.payload,
        timerOffset: offset,
        timerSeconds: action.payload
          ? offset + Math.floor((Date.now() - new Date(action.payload.start_time).getTime()) / 1000)
          : 0,
      }
    }
    case 'TICK_TIMER':
      // Recompute from start_time so sleep/wake doesn't lose elapsed seconds;
      // add timerOffset so resumed sessions continue from accumulated total
      return { ...state, timerSeconds: state.activeTimer
        ? state.timerOffset + Math.floor((Date.now() - new Date(state.activeTimer.start_time).getTime()) / 1000)
        : state.timerSeconds }
    case 'PAUSE_TIMER':
      // activeTimer → null stops the tick; timerSeconds preserved so display holds at paused value
      return { ...state, activeTimer: null, timerOffset: 0, timerPaused: true, pausedTask: action.payload }
    case 'CLEAR_PAUSE':
      return { ...state, timerPaused: false, pausedTask: null, timerSeconds: 0, timerOffset: 0 }
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const timerRef = useRef(null)

  // Apply theme to html element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark')
  }, [state.theme])

  // Timer tick — recomputes from start_time so sleep/wake never loses seconds
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (state.activeTimer) {
      timerRef.current = setInterval(() => dispatch({ type: 'TICK_TIMER' }), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [state.activeTimer])

  // Snap timer display immediately on screen wake
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      if (state.activeTimer) dispatch({ type: 'TICK_TIMER' })
      // Re-sync overdue count when returning to the app (handles day rollover
      // and reschedules/completions made elsewhere)
      loadOverdueTasks()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // loadOverdueTasks is a stable useCallback; referenced in the body only (not deps) to avoid TDZ
  }, [state.activeTimer])

  // Load projects on mount
  useEffect(() => {
    loadProjects()
    loadActiveTimer()
    loadOverdueTasks()
  }, [])

  const loadProjects = useCallback(async () => {
    const projects = await window.api.getProjects()
    dispatch({ type: 'SET_PROJECTS', payload: projects || [] })
  }, [])

  const loadOverdueTasks = useCallback(async () => {
    const tasks = await window.api.getOverdueTasks()
    dispatch({ type: 'SET_OVERDUE_TASKS', payload: tasks || [] })
  }, [])

  const loadActiveTimer = useCallback(async () => {
    const timer = await window.api.getActiveTimer()
    dispatch({ type: 'SET_ACTIVE_TIMER', payload: timer || null })
  }, [])

  const startTimer = useCallback(async (task, offset = 0) => {
    // Stop any existing timer first (saves it to DB)
    if (state.activeTimer) {
      const endTime = new Date().toISOString()
      const duration = Math.floor((Date.now() - new Date(state.activeTimer.start_time).getTime()) / 1000)
      await window.api.stopTimer(state.activeTimer.id, endTime, duration)
    }
    const entry = await window.api.createTimeEntry({
      task_id: task.id,
      project_id: task.project_id,
      start_time: new Date().toISOString(),
    })
    const full = await window.api.getActiveTimer()
    // Pass offset so the ticker continues from accumulated total (pause/resume continuity)
    dispatch({ type: 'SET_ACTIVE_TIMER', payload: full, offset })
    return entry
  }, [state.activeTimer])

  const stopTimer = useCallback(async () => {
    if (state.timerPaused) {
      dispatch({ type: 'CLEAR_PAUSE' })
      return
    }
    if (!state.activeTimer) return
    const endTime = new Date().toISOString()
    // Save only the current session's raw seconds (offset is already recorded in prior entries)
    const sessionSeconds = Math.floor((Date.now() - new Date(state.activeTimer.start_time).getTime()) / 1000)
    if (sessionSeconds < 10) {
      await window.api.deleteTimeEntry(state.activeTimer.id)
    } else {
      await window.api.stopTimer(state.activeTimer.id, endTime, sessionSeconds)
    }
    dispatch({ type: 'SET_ACTIVE_TIMER', payload: null })
  }, [state.activeTimer, state.timerSeconds, state.timerPaused])

  const pauseTimer = useCallback(async () => {
    if (!state.activeTimer) return
    // Capture the full accumulated time (offset + current session) so resume can continue from here
    const totalSoFar = state.timerSeconds
    const pausedTask = {
      id:                 state.activeTimer.task_id,
      project_id:         state.activeTimer.project_id,
      task_title:         state.activeTimer.task_title,
      project_name:       state.activeTimer.project_name,
      project_color:      state.activeTimer.project_color,
      accumulatedSeconds: totalSoFar,  // carry forward so resume continues the counter
    }
    const endTime = new Date().toISOString()
    // Only the current session's raw seconds go to the DB (timerSeconds already includes offset,
    // but the current entry was created fresh — compute raw session duration from start_time)
    const sessionSeconds = Math.floor((Date.now() - new Date(state.activeTimer.start_time).getTime()) / 1000)
    if (sessionSeconds < 10) {
      await window.api.deleteTimeEntry(state.activeTimer.id)
    } else {
      await window.api.stopTimer(state.activeTimer.id, endTime, sessionSeconds)
    }
    dispatch({ type: 'PAUSE_TIMER', payload: pausedTask })
  }, [state.activeTimer, state.timerSeconds])

  const resumeTimer = useCallback(async () => {
    if (!state.pausedTask) return
    const task = state.pausedTask
    const accumulated = task.accumulatedSeconds || 0
    dispatch({ type: 'CLEAR_PAUSE' })
    // Pass accumulated so the counter continues from where it was paused (e.g. 1:04:32 → 1:04:33)
    await startTimer(task, accumulated)
  }, [state.pausedTask, startTimer])

  const value = {
    state,
    dispatch,
    loadProjects,
    loadActiveTimer,
    loadOverdueTasks,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
