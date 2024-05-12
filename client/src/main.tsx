import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App/App.tsx'
import './index.css'
import { registerServiceWorker } from './services/serviceWorker.ts'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

registerServiceWorker()