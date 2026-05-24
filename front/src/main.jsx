import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ExamProvider } from './store/examStore'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ExamProvider>
        <App />
      </ExamProvider>
    </BrowserRouter>
  </React.StrictMode>
)
