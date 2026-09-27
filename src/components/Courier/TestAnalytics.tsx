import React from 'react'
import { useLanguage } from "../../contexts/LanguageContext"

const TestAnalytics: React.FC = () => {
  const { language } = useLanguage()
  const tl = (ar: string, en: string) => (language === 'ar' ? ar : en)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{tl('تحليلات المندوبين', 'Courier Analytics')}</h1>
        <p className="text-gray-600 mb-4">{tl('هذا مكون اختبار للتحليلات', 'Analytics test component')}</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">{tl('إذا كنت ترى هذه الرسالة، فالمكون يعمل بشكل صحيح!', 'If you see this message, the component works correctly!')}</p>
        </div>
      </div>
    </div>
  )
}

export default TestAnalytics
