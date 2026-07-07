import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './auth/AuthContext'

// Tema tercihi (localStorage) — sistem temasını data-theme ile ezer
const tema = localStorage.getItem('tema')
if (tema === 'dark' || tema === 'light') {
  document.documentElement.dataset.theme = tema
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
)
