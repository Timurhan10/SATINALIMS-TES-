import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ilkKurulum } from './seed'

// Tema tercihi (localStorage) — sistem temasını data-theme ile ezer
const tema = localStorage.getItem('tema')
if (tema === 'dark' || tema === 'light') {
  document.documentElement.dataset.theme = tema
}

// Tarayıcıdan kalıcı depolama iste: disk dolduğunda bile veriler silinmez.
navigator.storage?.persist?.().catch(() => {})

ilkKurulum().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>,
  )
})
