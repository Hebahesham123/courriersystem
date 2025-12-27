import React from 'react'
import { LogOut, Globe } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'

const Header: React.FC = () => {
  const { user, signOut } = useAuth()
  const { language, setLanguage, t } = useLanguage()

  const isRTL = language === 'ar'

  const handleLanguageToggle = () => {
    const newLang = language === 'en' ? 'ar' : 'en'
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = newLang
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 w-full z-30">
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between h-16 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Dashboard title */}
          <div className="text-lg font-semibold text-gray-900 whitespace-nowrap truncate">
            {user?.role === 'admin' ? t('adminDashboard') : t('courierDashboard')}
          </div>

          {/* Language and user actions */}
          <div className={`flex items-center gap-2 sm:gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Language Toggle */}
            <button
              onClick={handleLanguageToggle}
              className={`flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors ${
                isRTL ? 'flex-row-reverse' : ''
              }`}
            >
              <Globe className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'en' ? 'العربية' : 'English'}
            </button>

            {/* Username or email */}
            <span className="text-sm text-gray-600 max-w-[140px] truncate hidden sm:inline-block">
              {user?.name || user?.email}
            </span>

            {/* Logout button */}
            <button
              onClick={signOut}
              className={`flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors ${
                isRTL ? 'flex-row-reverse' : ''
              }`}
            >
              <LogOut className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
