import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Abertura } from './componentes/Abertura'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Abertura />
  </StrictMode>,
)
