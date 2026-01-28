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

// Load saved language preference or default to Arabic
const savedLanguage = localStorage.getItem('language') as 'en' | 'ar' | null
const language = savedLanguage === 'en' || savedLanguage === 'ar' ? savedLanguage : 'ar'
localStorage.setItem('language', language)

// Apply language and direction to document root (always LTR - left to right)
document.documentElement.lang = language
document.documentElement.dir = 'ltr'

// Add font class based on language
const rootElement = document.getElementById('root')
if (rootElement) {
  rootElement.classList.remove('font-sans', 'font-arabic')
  if (language === 'ar') {
    rootElement.classList.add('font-arabic')
  } else {
    rootElement.classList.add('font-sans')
  }

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
