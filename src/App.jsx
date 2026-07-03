import React, { useState, useEffect, useCallback } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { SettingsProvider } from './context/SettingsContext'
import Sidebar from './components/Layout/Sidebar'
import TopBar from './components/Layout/TopBar'
import Dashboard from './components/Dashboard/Dashboard'
import ProjectsView from './components/Projects/ProjectsView'
import ProjectBoard from './components/Projects/ProjectBoard'
import Reports from './components/Reports/Reports'
import CalendarView from './components/Calendar/CalendarView'
import SettingsPage from './components/Settings/SettingsPage'
import SearchModal from './components/Search/SearchModal'
import FocusMode from './components/Focus/FocusMode'
import ShortcutsModal from './components/UI/ShortcutsModal'
import JournalPage from './components/Journal/JournalPage'
import GoalsView from './components/Goals/GoalsView'
import InboxView from './components/Inbox/InboxView'
import QuickCaptureModal from './components/Inbox/QuickCaptureModal'
import { ToastContainer } from './components/UI/Toast'

function AppShell() {
  const { state, dispatch } = useApp()
  const { currentView, currentProject } = state
  const [showSearch,    setShowSearch]    = useState(false)
  const [showFocus,     setShowFocus]     = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showCapture,   setShowCapture]   = useState(false)
  const [autoPomodoro,  setAutoPomodoro]  = useState(false)
  const [pendingTaskId, setPendingTaskId] = useState(null)
  const [sidebarOpen,   setSidebarOpen]   = useState(false)

  function openFocusPomodoro() { setAutoPomodoro(true); setShowFocus(true) }
  function closeFocus() { setShowFocus(false); setAutoPomodoro(false) }

  function handleOpenTask({ taskId, projectId }) {
    const project = state.projects?.find(p => p.id === projectId)
    if (!project) return
    setPendingTaskId(taskId)
    dispatch({ type: 'SET_PROJECT', payload: project })
  }

  const handleKeyDown = useCallback((e) => {
    const inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault(); setShowSearch(v => !v); return
    }
    // ⌘N — Quick Capture anywhere
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault(); setShowCapture(v => !v); return
    }
    if (inInput) return
    if (e.key === 'f') { setShowFocus(v => !v); return }
    if (e.key === '?') { setShowShortcuts(v => !v); return }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex w-screen overflow-hidden bg-th-bg text-th-text1" style={{ height: '100dvh' }}>
      <Sidebar onOpenSearch={() => setShowSearch(true)} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onOpenFocus={() => setShowFocus(true)} onOpenSearch={() => setShowSearch(true)} onOpenShortcuts={() => setShowShortcuts(true)} onOpenTask={handleOpenTask} onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto bg-th-bg">
          {currentView === 'dashboard' && <Dashboard onOpenFocusPomodoro={openFocusPomodoro} />}
          {currentView === 'projects'  && !currentProject && <ProjectsView />}
          {currentView === 'project'   && currentProject  && <ProjectBoard onOpenFocusPomodoro={openFocusPomodoro} pendingTaskId={pendingTaskId} onPendingTaskConsumed={() => setPendingTaskId(null)} />}
          {currentView === 'reports'   && <Reports />}
          {currentView === 'calendar'  && <CalendarView onOpenFocusPomodoro={openFocusPomodoro} />}
          {currentView === 'journal'   && <JournalPage />}
          {currentView === 'goals'     && <GoalsView />}
          {currentView === 'inbox'     && <InboxView />}
          {currentView === 'settings'  && <SettingsPage />}
        </main>
      </div>

      {showSearch    && <SearchModal    onClose={() => setShowSearch(false)} />}
      {showFocus     && <FocusMode      onClose={closeFocus} autoStartPomodoro={autoPomodoro} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      <QuickCaptureModal open={showCapture} onClose={() => setShowCapture(false)} />
      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <SettingsProvider>
        <AppShell />
      </SettingsProvider>
    </AppProvider>
  )
}
