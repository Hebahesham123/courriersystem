import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Hide app loader when app is ready
const hideLoader = () => {
  const loader = document.getElementById('app-loader')
  if (loader) {
    loader.classList.add('hidden')
    // Remove from DOM after animation
    setTimeout(() => loader.remove(), 300)
  }
}

// Always force Arabic language
const language = 'ar'
localStorage.setItem('language', 'ar')

// Apply language and direction to document root (always LTR - left to right)
document.documentElement.lang = language
document.documentElement.dir = 'ltr'

// Add Arabic font class to <body>
const rootElement = document.getElementById('root')
if (rootElement) {
  rootElement.classList.add('font-arabic')

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
  
  // Hide loader after a short delay to ensure app is rendered
  setTimeout(hideLoader, 100)
} else {
  console.error('❌ Root element not found in index.html')
}
