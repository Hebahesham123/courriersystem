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

// Set up direction and font based on saved language
const language = localStorage.getItem('language') === 'ar' ? 'ar' : 'en'

// Apply language and direction to document root
document.documentElement.lang = language
document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'

// Add appropriate font class to <body>
const rootElement = document.getElementById('root')
if (rootElement) {
  rootElement.classList.add(language === 'ar' ? 'font-arabic' : 'font-sans')

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
