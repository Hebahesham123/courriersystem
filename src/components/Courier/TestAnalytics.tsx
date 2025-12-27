import React from 'react'

const TestAnalytics: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">تحليلات المندوبين</h1>
        <p className="text-gray-600 mb-4">هذا مكون اختبار للتحليلات</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">إذا كنت ترى هذه الرسالة، فالمكون يعمل بشكل صحيح!</p>
        </div>
      </div>
    </div>
  )
}

export default TestAnalytics
