"use client"

import React, { useState, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import {
  DollarSign,
  Calendar,
  Save,
  Plus,
  Edit,
  Trash2,
  User,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react'

interface Courier {
  id: string
  name: string
  email: string
  role: string
}

interface CourierFee {
  id: string
  courier_id: string
  fee_amount: number
  fee_date: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

const CourierFeesManagement: React.FC = () => {
  const { language } = useLanguage()
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [courierFees, setCourierFees] = useState<CourierFee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingFee, setEditingFee] = useState<CourierFee | null>(null)
  const [formData, setFormData] = useState({
    courier_id: '',
    fee_amount: '',
    fee_date: new Date().toISOString().split('T')[0]
  })

  // Filter states
  const [filters, setFilters] = useState({
    courierName: '',
    startDate: '',
    endDate: '',
    showActiveOnly: true
  })

  const isRTL = language === 'ar'

  useEffect(() => {
    fetchCouriers()
    fetchCourierFees()
  }, [])

  const fetchCouriers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('role', 'courier')
        .order('name')

      if (error) throw error
      setCouriers(data || [])
    } catch (error) {
      console.error('Error fetching couriers:', error)
    }
  }

  const fetchCourierFees = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('courier_fees')
        .select('*')
        .order('fee_date', { ascending: false })

      if (error) throw error
      setCourierFees(data || [])
    } catch (error) {
      console.error('Error fetching courier fees:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.courier_id || !formData.fee_amount || !formData.fee_date) {
      alert('Please fill in all required fields')
      return
    }

    try {
      if (editingFee) {
        // Update existing fee
        const { error } = await supabase
          .from('courier_fees')
          .update({
            fee_amount: parseFloat(formData.fee_amount),
            fee_date: formData.fee_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFee.id)

        if (error) throw error
      } else {
        // Create new fee
        const { error } = await supabase
          .from('courier_fees')
          .insert([{
            courier_id: formData.courier_id,
            fee_amount: parseFloat(formData.fee_amount),
            fee_date: formData.fee_date,
            created_by: null // Set to null for now, or get actual admin user ID
          }])

        if (error) throw error
      }

      // Reset form and refresh data
      setFormData({
        courier_id: '',
        fee_amount: '',
        fee_date: new Date().toISOString().split('T')[0]
      })
      setEditingFee(null)
      setShowAddModal(false)
      await fetchCourierFees()
    } catch (error) {
      console.error('Error saving courier fee:', error)
      
      // Show more specific error message
      let errorMessage = 'Failed to save courier fee. Please try again.'
      
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `Error: ${error.message}`
      } else if (typeof error === 'string') {
        errorMessage = `Error: ${error}`
      }
      
      alert(errorMessage)
    }
  }

  const handleEdit = (fee: CourierFee) => {
    setEditingFee(fee)
    setFormData({
      courier_id: fee.courier_id,
      fee_amount: fee.fee_amount.toString(),
      fee_date: fee.fee_date
    })
    setShowAddModal(true)
  }

  const handleDelete = async (feeId: string) => {
    if (!confirm('Are you sure you want to delete this fee?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('courier_fees')
        .delete()
        .eq('id', feeId)

      if (error) throw error
      await fetchCourierFees()
    } catch (error) {
      console.error('Error deleting courier fee:', error)
      alert('Failed to delete courier fee. Please try again.')
    }
  }

  const getCourierName = (courierId: string) => {
    const courier = couriers.find(c => c.id === courierId)
    return courier ? courier.name : 'Unknown Courier'
  }

  const getActiveFeeForCourier = (courierId: string, date: string) => {
    return courierFees.find(fee => 
      fee.courier_id === courierId && 
      fee.fee_date === date && 
      fee.is_active
    )
  }

  // Filter courier fees based on current filters
  const getFilteredCourierFees = () => {
    return courierFees.filter(fee => {
      const courier = couriers.find(c => c.id === fee.courier_id)
      if (!courier) return false

      // Filter by courier name
      if (filters.courierName && !courier.name.toLowerCase().includes(filters.courierName.toLowerCase())) {
        return false
      }

      // Filter by date range
      if (filters.startDate && fee.fee_date < filters.startDate) {
        return false
      }
      if (filters.endDate && fee.fee_date > filters.endDate) {
        return false
      }

      // Filter by active status
      if (filters.showActiveOnly && !fee.is_active) {
        return false
      }

      return true
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      courierName: '',
      startDate: '',
      endDate: '',
      showActiveOnly: true
    })
  }

  const resetForm = () => {
    setFormData({
      courier_id: '',
      fee_amount: '',
      fee_date: new Date().toISOString().split('T')[0]
    })
    setEditingFee(null)
    setShowAddModal(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {language === 'ar' ? 'إدارة رسوم المندوبين' : 'Courier Fees Management'}
                </h1>
                <p className="text-gray-600">
                  {language === 'ar' 
                    ? 'إدارة الرسوم اليومية لكل مندوب' 
                    : 'Manage daily delivery fees for each courier'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{language === 'ar' ? 'إضافة رسوم' : 'Add Fee'}</span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {language === 'ar' ? 'الفلاتر' : 'Filters'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Courier Name Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'اسم المندوب' : 'Courier Name'}
              </label>
              <input
                type="text"
                value={filters.courierName}
                onChange={(e) => setFilters({...filters, courierName: e.target.value})}
                placeholder={language === 'ar' ? 'ابحث عن اسم المندوب...' : 'Search courier name...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'من تاريخ' : 'From Date'}
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'إلى تاريخ' : 'To Date'}
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Active Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'الحالة' : 'Status'}
              </label>
              <select
                value={filters.showActiveOnly ? 'active' : 'all'}
                onChange={(e) => setFilters({...filters, showActiveOnly: e.target.value === 'active'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">{language === 'ar' ? 'نشط فقط' : 'Active Only'}</option>
                <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              {language === 'ar' ? 'النتائج:' : 'Results:'} {getFilteredCourierFees().length} {language === 'ar' ? 'رسوم' : 'fees'}
            </div>
            <div className="flex items-center space-x-3">
              {/* Quick Date Presets */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0]
                    setFilters({...filters, startDate: today, endDate: today})
                  }}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  {language === 'ar' ? 'اليوم' : 'Today'}
                </button>
                <button
                  onClick={() => {
                    const today = new Date()
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                    setFilters({...filters, startDate: weekAgo.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0]})
                  }}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  {language === 'ar' ? 'آخر أسبوع' : 'Last Week'}
                </button>
                <button
                  onClick={() => {
                    const today = new Date()
                    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
                    setFilters({...filters, startDate: monthAgo.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0]})
                  }}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  {language === 'ar' ? 'آخر شهر' : 'Last Month'}
                </button>
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
              </button>
            </div>
          </div>
        </div>

        {/* Current Fees Overview */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {language === 'ar' ? 'الرسوم الحالية' : 'Current Fees'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {couriers.map(courier => {
              const today = new Date().toISOString().split('T')[0]
              const activeFee = getActiveFeeForCourier(courier.id, today)
              
              return (
                <div key={courier.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900">{courier.name}</span>
                    </div>
                    {activeFee ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      {language === 'ar' ? 'البريد الإلكتروني:' : 'Email:'} {courier.email}
                    </div>
                    
                    {activeFee ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {language === 'ar' ? 'الرسوم اليومية:' : 'Daily Fee:'}
                        </span>
                        <span className="font-semibold text-green-600">
                          {activeFee.fee_amount} د.ك
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-yellow-600">
                        {language === 'ar' ? 'لا توجد رسوم محددة لهذا اليوم' : 'No fee set for today'}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      if (activeFee) {
                        handleEdit(activeFee)
                      } else {
                        setFormData({
                          courier_id: courier.id,
                          fee_amount: '',
                          fee_date: today
                        })
                        setShowAddModal(true)
                      }
                    }}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>
                      {activeFee 
                        ? (language === 'ar' ? 'تعديل' : 'Edit')
                        : (language === 'ar' ? 'إضافة رسوم' : 'Add Fee')
                      }
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Fees History Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {language === 'ar' ? 'سجل الرسوم' : 'Fees History'}
              </h3>
              <div className="text-sm text-gray-600">
                {language === 'ar' ? 'إجمالي الرسوم:' : 'Total Fees:'} {getFilteredCourierFees().reduce((sum, fee) => sum + fee.fee_amount, 0).toFixed(2)} د.ك
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'المندوب' : 'Courier'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'المبلغ' : 'Amount'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'التاريخ' : 'Date'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                 {getFilteredCourierFees().length > 0 ? (
                   getFilteredCourierFees().map((fee) => (
                     <tr key={fee.id} className="hover:bg-gray-50">
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center">
                           <User className="w-5 h-5 text-blue-600 mr-2" />
                           <span className="text-sm font-medium text-gray-900">
                             {getCourierName(fee.courier_id)}
                           </span>
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center">
                           <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                           <span className="text-sm text-gray-900 font-medium">
                             {fee.fee_amount} د.ك
                           </span>
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center">
                           <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                           <span className="text-sm text-gray-900">
                             {new Date(fee.fee_date).toLocaleDateString()}
                           </span>
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                           fee.is_active 
                             ? 'bg-green-100 text-green-800' 
                             : 'bg-gray-100 text-gray-800'
                         }`}>
                           {fee.is_active 
                             ? (language === 'ar' ? 'نشط' : 'Active')
                             : (language === 'ar' ? 'غير نشط' : 'Inactive')
                           }
                         </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                         <div className="flex space-x-2">
                           <button
                             onClick={() => handleEdit(fee)}
                             className="text-blue-600 hover:text-blue-900 p-1"
                             title={language === 'ar' ? 'تعديل' : 'Edit'}
                           >
                             <Edit className="w-4 h-4" />
                           </button>
                           <button
                             onClick={() => handleDelete(fee.id)}
                             className="text-red-600 hover:text-red-900 p-1"
                             title={language === 'ar' ? 'حذف' : 'Delete'}
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       </td>
                     </tr>
                   ))
                 ) : (
                   <tr>
                     <td colSpan={5} className="px-6 py-12 text-center">
                       <div className="text-gray-500">
                         <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                         <p className="text-lg font-medium">
                           {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                         </p>
                         <p className="text-sm">
                           {language === 'ar' 
                             ? 'جرب تغيير الفلاتر أو إضافة رسوم جديدة' 
                             : 'Try adjusting your filters or add new fees'
                           }
                         </p>
                       </div>
                     </td>
                   </tr>
                 )}
               </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingFee 
                      ? (language === 'ar' ? 'تعديل الرسوم' : 'Edit Fee')
                      : (language === 'ar' ? 'إضافة رسوم جديدة' : 'Add New Fee')
                    }
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'ar' ? 'المندوب' : 'Courier'}
                    </label>
                    <select
                      value={formData.courier_id}
                      onChange={(e) => setFormData({...formData, courier_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">
                        {language === 'ar' ? 'اختر المندوب' : 'Select Courier'}
                      </option>
                      {couriers.map(courier => (
                        <option key={courier.id} value={courier.id}>
                          {courier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'ar' ? 'المبلغ' : 'Amount'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.fee_amount}
                        onChange={(e) => setFormData({...formData, fee_amount: e.target.value})}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                        required
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        د.ك
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'ar' ? 'التاريخ' : 'Date'}
                    </label>
                    <input
                      type="date"
                      value={formData.fee_date}
                      onChange={(e) => setFormData({...formData, fee_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {editingFee 
                        ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                        : (language === 'ar' ? 'إضافة الرسوم' : 'Add Fee')
                      }
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CourierFeesManagement
