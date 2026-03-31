import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

document.documentElement.lang = 'fr'
document.documentElement.setAttribute('translate', 'no')
document.title = 'NAKY'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
