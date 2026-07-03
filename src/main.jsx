import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import CloudSetup from './components/Setup/CloudSetup'
import { bootstrapApi } from './utils/bootstrapApi'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root'))

bootstrapApi().then(mode => {
  root.render(
    <React.StrictMode>
      {mode === 'setup' ? <CloudSetup /> : <App />}
    </React.StrictMode>
  )
}).catch(err => {
  console.error('[Momentum] bootstrap failed:', err)
  root.render(<CloudSetup />)
})
