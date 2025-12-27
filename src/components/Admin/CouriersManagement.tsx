import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Pencil, Save } from 'lucide-react'

const CouriersManagement: React.FC = () => {
  const [couriers, setCouriers] = useState<any[]>([])
  const [editMode, setEditMode] = useState<{ [id: string]: boolean }>({})

  // Simple bilingual translation function
  const translate = (key: string) => {
    const translations: Record<string, string> = {
      manageCouriers: 'Manage Couriers / إدارة المندوبين',
      name: 'Name / الاسم',
      email: 'Email / البريد الإلكتروني',
      actions: 'Actions / الإجراءات',
      edit: 'Edit / تعديل',
      save: 'Save / حفظ',
    }
    return translations[key] || key
  }

  useEffect(() => {
    fetchCouriers()
  }, [])

  const fetchCouriers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'courier')

    if (error) {
      console.error('Error fetching couriers:', error.message)
    } else {
      setCouriers(data)
    }
  }

  const handleChange = (id: string, field: string, value: string) => {
    setCouriers(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  const saveChanges = async (courier: any) => {
    const { id, name, email } = courier
    const { error } = await supabase.from('users').update({ name, email }).eq('id', id)

    if (error) {
      console.error('Error saving changes:', error.message)
    } else {
      setEditMode(prev => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="ltr" lang="en">
      <h2 className="text-2xl font-bold mb-4">{translate('manageCouriers')}</h2>
      <table className="w-full table-auto border border-collapse text-left">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">{translate('name')}</th>
            <th className="p-2 border">{translate('email')}</th>
            <th className="p-2 border">{translate('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {couriers.map(courier => (
            <tr key={courier.id} className="hover:bg-gray-50">
              <td className="border p-2 align-middle">
                {editMode[courier.id] ? (
                  <input
                    value={courier.name}
                    onChange={e => handleChange(courier.id, 'name', e.target.value)}
                    className="border p-1 w-full rounded"
                    aria-label={`${translate('name')} - ${courier.name}`}
                  />
                ) : (
                  courier.name
                )}
              </td>
              <td className="border p-2 align-middle">
                {editMode[courier.id] ? (
                  <input
                    value={courier.email}
                    onChange={e => handleChange(courier.id, 'email', e.target.value)}
                    className="border p-1 w-full rounded"
                    aria-label={`${translate('email')} - ${courier.email}`}
                  />
                ) : (
                  courier.email
                )}
              </td>
              <td className="border p-2 align-middle">
                {editMode[courier.id] ? (
                  <button
                    onClick={() => saveChanges(courier)}
                    className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                    aria-label={`${translate('save')} ${courier.name}`}
                  >
                    <Save className="w-4 h-4" />
                    {translate('save')}
                  </button>
                ) : (
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, [courier.id]: true }))}
                    className="bg-yellow-500 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    aria-label={`${translate('edit')} ${courier.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                    {translate('edit')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default CouriersManagement
