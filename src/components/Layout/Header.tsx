import React from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'

const Header: React.FC = () => {
  const { user, signOut } = useAuth()
  const { t } = useLanguage()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 w-full z-30">
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Dashboard title */}
          <div className="text-lg font-semibold text-gray-900 whitespace-nowrap truncate">
            {user?.role === 'admin' ? t('adminDashboard') : t('courierDashboard')}
          </div>

          {/* User actions - Language toggle removed, always Arabic */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Username or email */}
            <span className="text-sm text-gray-600 max-w-[140px] truncate hidden sm:inline-block">
              {user?.name || user?.email}
            </span>

            {/* Logout button */}
            <button
              onClick={signOut}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
