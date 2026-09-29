"use client"

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  MessageSquare,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Users,
  FileText,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Trash2,
  Save,
  X,
  BarChart3,
  Hash,
  Wrench,
} from 'lucide-react'

interface Request {
  id: string
  name: string
  email: string
  phone: string
  comment: string
  order_id?: string | null
  image_url?: string
  video_url?: string
  status: 'pending' | 'process' | 'approved' | 'cancelled'
  assignee?: string | null
  created_by: string
  created_at: string
  updated_at: string
}

interface RequestNote {
  id: string
  request_id: string
  note: string
  author: string
  image_url?: string | null
  created_at: string
}

// line_items may arrive as a JSON string or an array.
const parseItems = (raw: any): any[] => {
  if (!raw) return []
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
const itemQty = (it: any): number => Number(it?.quantity ?? it?.current_quantity ?? it?.qty ?? 1) || 1
const itemVariant = (it: any): string | null =>
  it?.variant_title && it.variant_title !== 'Default Title' ? it.variant_title : null
const itemLabel = (it: any): string => {
  const v = itemVariant(it)
  return `${it?.title || it?.name || 'Product'}${v ? ` - ${v}` : ''} × ${itemQty(it)}`
}

const RequestsManagement: React.FC = () => {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [requests, setRequests] = useState<Request[]>([])
  const [notes, setNotes] = useState<RequestNote[]>([])
  const [repairUserId, setRepairUserId] = useState('')
  const [repairBusyId, setRepairBusyId] = useState<string | null>(null)
  // Item picker when a request's order has more than one item.
  const [repairModal, setRepairModal] = useState<null | { orderIds: string[]; primaryId: string; items: any[]; label: string }>(null)
  const [repairItemChoice, setRepairItemChoice] = useState<string>('')
  const [repairSaving, setRepairSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 50
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  })
  const [showReportPage, setShowReportPage] = useState(false)
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(['pending', 'process', 'approved', 'cancelled']))
  const [reportRequests, setReportRequests] = useState<Request[]>([])
  
  // Media modal states
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string>('')
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    comment: '',
    order_id: '',
    image_url: '',
    video_url: '',
  })
  
  // File upload states
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  
  // Note image upload state
  const [noteImageFile, setNoteImageFile] = useState<File | null>(null)
  const [newNote, setNewNote] = useState('')
  const [assignee, setAssignee] = useState('')
  const [status, setStatus] = useState<Request['status']>('pending')
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<Request['status']>('pending')
  const [bulkAssignee, setBulkAssignee] = useState<string>('')

  const assignees = ['Toka', 'Marina', 'Shrouq', 'Mariam', 'Amira', 'Salma']
  const statuses: { value: Request['status']; label: string; color: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'pending', label: language === 'ar' ? 'قيد الانتظار' : 'Pending', color: 'text-yellow-500', icon: Clock },
    { value: 'process', label: language === 'ar' ? 'قيد المعالجة' : 'In Process', color: 'text-blue-500', icon: Play },
    { value: 'approved', label: language === 'ar' ? 'مقبول' : 'Approved', color: 'text-green-500', icon: CheckCircle },
    { value: 'cancelled', label: language === 'ar' ? 'ملغي' : 'Cancelled', color: 'text-red-500', icon: XCircle },
  ]

  const isRTL = language === 'ar'
  const tl = (ar: string, en: string) => (language === 'ar' ? ar : en)

  useEffect(() => {
    fetchRequests()
    fetchNotes()
  }, [])

  // Load the repair user (Karim) so a request's order can be sent to repair.
  useEffect(() => {
    supabase
      .from('users')
      .select('id')
      .eq('role', 'repair')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setRepairUserId((data as any)?.id || ''))
  }, [])

  // Low-level: assign a set of order rows to the repair user.
  const assignOrdersToRepair = async (ids: string[], repairItem: any) => {
    const { error } = await supabase
      .from('orders')
      .update({
        repair_assigned_to: repairUserId,
        repair_status: 'assigned',
        repair_assigned_at: new Date().toISOString(),
        repair_assigned_by: user?.name || user?.email || 'admin',
        repair_item: repairItem,
        repair_admin_received: false,
        repair_admin_received_at: null,
        repair_admin_received_by: null,
      })
      .in('id', ids)
    if (error) throw error
  }

  // Send the order referenced by a customer request to the repair user (Karim).
  // If the order has more than one item, open a picker to choose which item.
  const sendRequestToRepair = async (request: Request) => {
    const raw = (request.order_id || '').replace('#', '').trim()
    if (!raw) {
      alert(tl('لا يوجد رقم طلب لهذا الطلب', 'This request has no order ID'))
      return
    }
    if (!repairUserId) {
      alert(tl('لا يوجد مستخدم تصليح. أنشئ حساب كريم أولاً.', 'No repair user. Create Karim first.'))
      return
    }
    setRepairBusyId(request.id)
    try {
      // Prefer an exact order_id match; fall back to date-suffixed / shopify name.
      let found = (await supabase.from('orders').select('id, order_id, line_items').eq('order_id', raw).order('created_at', { ascending: false }).limit(10))
        .data as any[] | null
      if (!found || found.length === 0) {
        found = (
          await supabase
            .from('orders')
            .select('id, order_id, line_items')
            .or(`order_id.ilike.${raw}-%,shopify_order_name.ilike.%${raw}%`)
            .order('created_at', { ascending: false })
            .limit(10)
        ).data as any[] | null
      }
      if (!found || found.length === 0) {
        alert(tl(`لا يوجد طلب بالرقم ${raw}`, `No order found for ${raw}`))
        return
      }
      const primary = found[0]
      const items = parseItems(primary.line_items)
      if (items.length > 1) {
        // Let the admin choose which item (or the whole order).
        setRepairItemChoice('')
        setRepairModal({
          orderIds: found.map((f) => f.id),
          primaryId: primary.id,
          items,
          label: `#${primary.order_id || raw}`,
        })
        return
      }
      // Single-item (or no items) order → assign the whole order directly.
      await assignOrdersToRepair(found.map((f) => f.id), null)
      alert(tl(`تم إرسال الطلب ${raw} للتصليح`, `Order ${raw} sent to repair`))
    } catch (e: any) {
      alert(tl('فشل الإرسال للتصليح', 'Failed to send to repair') + ': ' + (e?.message || ''))
    } finally {
      setRepairBusyId(null)
    }
  }

  // Confirm the item picker modal.
  const confirmRepairModal = async () => {
    if (!repairModal) return
    setRepairSaving(true)
    try {
      if (repairItemChoice === '') {
        // Whole order → all matched rows.
        await assignOrdersToRepair(repairModal.orderIds, null)
      } else {
        const idx = Number(repairItemChoice)
        const it = repairModal.items[idx]
        const repairItem = it
          ? {
              index: idx,
              title: it.title || it.name || null,
              variant_title: itemVariant(it),
              sku: it.sku || null,
              quantity: itemQty(it),
              product_id: it.product_id ?? null,
            }
          : null
        // A specific item applies to the single primary order row.
        await assignOrdersToRepair([repairModal.primaryId], repairItem)
      }
      alert(tl('تم الإرسال للتصليح', 'Sent to repair'))
      setRepairModal(null)
    } catch (e: any) {
      alert(tl('فشل الإرسال للتصليح', 'Failed to send to repair') + ': ' + (e?.message || ''))
    } finally {
      setRepairSaving(false)
    }
  }

  // Handle ESC key to close media modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showMediaModal) {
        setShowMediaModal(false)
      }
    }

    if (showMediaModal) {
      document.addEventListener('keydown', handleEscKey)
      return () => document.removeEventListener('keydown', handleEscKey)
    }
  }, [showMediaModal])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('request_notes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      console.log('Fetched notes:', data)
      console.log('Notes with images:', data?.filter(note => note.image_url))
      
      setNotes(data || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  // Clear note input when opening/closing detail modal or switching requests
  useEffect(() => {
    if (!showDetailModal || !selectedRequest) {
      setNewNote('')
      setNoteImageFile(null)
    }
  }, [showDetailModal, selectedRequest?.id])

  const validateFile = (file: File, type: 'image' | 'video'): boolean => {
    const maxSize = type === 'image' ? 5 * 1024 * 1024 : 50 * 1024 * 1024 // 5MB for images, 50MB for videos
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi']
    
    if (file.size > maxSize) {
      alert(tl(`يجب أن يكون حجم ${type === 'image' ? 'الصورة' : 'الفيديو'} أقل من ${type === 'image' ? '5MB' : '50MB'}`, `${type === 'image' ? 'Image' : 'Video'} file size must be less than ${type === 'image' ? '5MB' : '50MB'}`))
      return false
    }
    
    if (type === 'image' && !allowedImageTypes.includes(file.type)) {
      alert(tl('يرجى اختيار ملف صورة صالح (JPEG, PNG, GIF, أو WebP)', 'Please select a valid image file (JPEG, PNG, GIF, or WebP)'))
      return false
    }
    
    if (type === 'video' && !allowedVideoTypes.includes(file.type)) {
      alert(tl('يرجى اختيار ملف فيديو صالح (MP4, WebM, OGG, أو AVI)', 'Please select a valid video file (MP4, WebM, OGG, or AVI)'))
      return false
    }
    
    return true
  }

  const uploadFile = async (file: File, type: 'image' | 'video'): Promise<string | null> => {
    try {
      if (!validateFile(file, type)) {
        return null
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `requests/${type}s/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      return null
    }
  }

  const uploadNoteImage = async (file: File): Promise<string | null> => {
    try {
      if (!validateFile(file, 'image')) {
        return null
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `request_notes/images/${fileName}`

      console.log('Uploading note image to path:', filePath)

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath)

      console.log('Note image uploaded successfully:', publicUrl)
      return publicUrl
    } catch (error) {
      console.error('Error uploading note image:', error)
      return null
    }
  }

  const removeFile = (type: 'image' | 'video') => {
    if (type === 'image') {
      setImageFile(null)
    } else {
      setVideoFile(null)
    }
  }

  const removeNoteImage = () => {
    setNoteImageFile(null)
  }

  const createRequest = async () => {
    try {
      setUploading(true)
      
      let imageUrl = formData.image_url
      let videoUrl = formData.video_url

      // Upload image file if selected
      if (imageFile) {
        const uploadedImageUrl = await uploadFile(imageFile, 'image')
        if (uploadedImageUrl) {
          imageUrl = uploadedImageUrl
        }
      }

      // Upload video file if selected
      if (videoFile) {
        const uploadedVideoUrl = await uploadFile(videoFile, 'video')
        if (uploadedVideoUrl) {
          videoUrl = uploadedVideoUrl
        }
      }

      const { data, error } = await supabase
        .from('requests')
        .insert([{
          ...formData,
          image_url: imageUrl,
          video_url: videoUrl,
          status: 'pending',
          assignee: null,
          created_by: 'admin:manual',
        }])
        .select()

      if (error) throw error
      
      await fetchRequests()
      setShowCreateModal(false)
      setFormData({ name: '', email: '', phone: '', comment: '', order_id: '', image_url: '', video_url: '' })
      setImageFile(null)
      setVideoFile(null)
    } catch (error) {
      console.error('Error creating request:', error)
    } finally {
      setUploading(false)
    }
  }

  const updateRequest = async (requestId: string, updates: Partial<Request>) => {
    try {
      setUploading(true)
      
      let imageUrl = updates.image_url
      let videoUrl = updates.video_url

      // Upload new image file if selected
      if (imageFile) {
        const uploadedImageUrl = await uploadFile(imageFile, 'image')
        if (uploadedImageUrl) {
          imageUrl = uploadedImageUrl
        }
      }

      // Upload new video file if selected
      if (videoFile) {
        const uploadedVideoUrl = await uploadFile(videoFile, 'video')
        if (uploadedVideoUrl) {
          videoUrl = uploadedVideoUrl
        }
      }

      const finalUpdates = {
        ...updates,
        image_url: imageUrl,
        video_url: videoUrl,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('requests')
        .update(finalUpdates)
        .eq('id', requestId)

      if (error) throw error
      
      await fetchRequests()
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, ...finalUpdates })
      }
      
      // Clear file selections after successful update
      setImageFile(null)
      setVideoFile(null)
    } catch (error) {
      console.error('Error updating request:', error)
    } finally {
      setUploading(false)
    }
  }

  const addNote = async () => {
    // Allow adding note with just image, just text, or both
    if (!selectedRequest) {
      alert(tl('يرجى اختيار طلب لإضافة ملاحظة إليه.', 'Please select a request to add a note to.'))
      return
    }

    // Validate that at least note text or image is provided
    if (!newNote.trim() && !noteImageFile) {
      alert(tl('يرجى إدخال نص ملاحظة أو اختيار صورة لإرفاقها.', 'Please enter a note text or select an image to attach.'))
      return
    }

    try {
      let noteImageUrl = null
      
      // Upload note image if selected
      if (noteImageFile) {
        const uploadedImageUrl = await uploadNoteImage(noteImageFile)
        if (uploadedImageUrl) {
          noteImageUrl = uploadedImageUrl
        } else {
          alert(tl('فشل رفع الصورة. يرجى المحاولة مرة أخرى.', 'Failed to upload image. Please try again.'))
          return
        }
      }

      // Prepare note data - note text can be empty if only image
      const noteText = newNote.trim() || null

      const { data, error } = await supabase
        .from('request_notes')
        .insert([{
          request_id: selectedRequest.id,
          note: noteText || null, // Store null if only image
          author: 'admin',
          image_url: noteImageUrl,
        }])
        .select()

      if (error) {
        console.error('Error adding note:', error)
        alert(tl(`فشل حفظ الملاحظة: ${error.message}`, `Failed to save note: ${error.message}`))
        throw error
      }
      
      console.log('Note saved successfully:', data)
      alert(tl('تم حفظ الملاحظة بنجاح!', 'Note saved successfully!'))
      
      // Refresh notes for the current request
      await fetchNotes()
      
      // Clear the input fields
      setNewNote('')
      setNoteImageFile(null)
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (error) {
      console.error('Error adding note:', error)
      // Error alert already shown above
    }
  }

  const deleteRequest = async (requestId: string) => {
    if (!confirm(tl('هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.', 'Are you sure you want to delete this request? This action cannot be undone.'))) {
      return
    }

    // Store original request for rollback
    const originalRequest = requests.find(r => r.id === requestId)
    
    // Optimistically remove from UI
    setRequests(prev => prev.filter(r => r.id !== requestId))
    
    // Close detail modal if it was open for the deleted request
    if (selectedRequest?.id === requestId) {
      setSelectedRequest(null)
    }

    try {
      // First delete any associated notes
      const { error: notesError } = await supabase
        .from('request_notes')
        .delete()
        .eq('request_id', requestId)

      if (notesError) {
        console.error('Error deleting notes:', notesError)
      }

      // Then delete the request
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', requestId)

      if (error) {
        // Rollback on error
        if (originalRequest) {
          setRequests(prev => [...prev, originalRequest].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ))
        }
        throw error
      }
      
      console.log('Request deleted successfully')
    } catch (error) {
      console.error('Error deleting request:', error)
      alert(tl('فشل حذف الطلب. يرجى المحاولة مرة أخرى.', 'Failed to delete request. Please try again.'))
    }
  }

  const bulkUpdateStatus = async () => {
    if (selectedRequests.size === 0) return
    
    const requestIds = Array.from(selectedRequests)
    const originalRequests = requests.filter(r => requestIds.includes(r.id))
    
    // Optimistically update UI
    setRequests(prev => prev.map(r => 
      requestIds.includes(r.id) 
        ? { ...r, status: bulkStatus, updated_at: new Date().toISOString() }
        : r
    ))
    setSelectedRequests(new Set())
    
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: bulkStatus, updated_at: new Date().toISOString() })
        .in('id', requestIds)

      if (error) {
        // Rollback on error
        setRequests(prev => prev.map(r => {
          const original = originalRequests.find(or => or.id === r.id)
          return original ? original : r
        }))
        throw error
      }
      
      alert(tl(`تم تحديث ${requestIds.length} طلب إلى ${bulkStatus}`, `Updated ${requestIds.length} requests to ${bulkStatus}`))
    } catch (error) {
      console.error('Error bulk updating status:', error)
      alert(tl('فشل تحديث الطلبات. يرجى المحاولة مرة أخرى.', 'Failed to update requests. Please try again.'))
    }
  }

  const bulkUpdateAssignee = async () => {
    if (selectedRequests.size === 0 || !bulkAssignee) return
    
    const requestIds = Array.from(selectedRequests)
    const originalRequests = requests.filter(r => requestIds.includes(r.id))
    
    // Optimistically update UI
    setRequests(prev => prev.map(r => 
      requestIds.includes(r.id) 
        ? { ...r, assignee: bulkAssignee, updated_at: new Date().toISOString() }
        : r
    ))
    setSelectedRequests(new Set())
    
    try {
      const { error } = await supabase
        .from('requests')
        .update({ assignee: bulkAssignee, updated_at: new Date().toISOString() })
        .in('id', requestIds)

      if (error) {
        // Rollback on error
        setRequests(prev => prev.map(r => {
          const original = originalRequests.find(or => or.id === r.id)
          return original ? original : r
        }))
        throw error
      }
      
      alert(tl(`تم تعيين ${requestIds.length} طلب إلى ${bulkAssignee}`, `Assigned ${requestIds.length} requests to ${bulkAssignee}`))
    } catch (error) {
      console.error('Error bulk updating assignee:', error)
      alert(tl('فشل تحديث الطلبات. يرجى المحاولة مرة أخرى.', 'Failed to update requests. Please try again.'))
    }
  }

  const bulkDeleteSelected = async () => {
    if (selectedRequests.size === 0) return

    if (!confirm(tl(`هل أنت متأكد من حذف ${selectedRequests.size} طلب محدد؟ لا يمكن التراجع عن هذا الإجراء.`, `Are you sure you want to delete ${selectedRequests.size} selected request(s)? This action cannot be undone.`))) {
      return
    }

    try {
      const requestIds = Array.from(selectedRequests)

      // Delete associated notes for all selected requests
      const { error: notesError } = await supabase
        .from('request_notes')
        .delete()
        .in('request_id', requestIds)

      if (notesError) {
        console.error('Error deleting notes for bulk delete:', notesError)
      }

      // Then delete the requests
      const { error } = await supabase
        .from('requests')
        .delete()
        .in('id', requestIds)

      if (error) throw error

      await fetchRequests()
      setSelectedRequests(new Set())
      alert(tl(`تم حذف ${requestIds.length} طلب.`, `Deleted ${requestIds.length} requests.`))
    } catch (error) {
      console.error('Error bulk deleting requests:', error)
      alert(tl('فشل حذف الطلبات. يرجى المحاولة مرة أخرى.', 'Failed to delete requests. Please try again.'))
    }
  }

  const toggleRequestSelection = (requestId: string) => {
    const newSelected = new Set(selectedRequests)
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId)
    } else {
      newSelected.add(requestId)
    }
    setSelectedRequests(newSelected)
  }

  const selectAllRequests = () => {
    if (selectedRequests.size === filteredRequests.length) {
      setSelectedRequests(new Set())
    } else {
      setSelectedRequests(new Set(filteredRequests.map(r => r.id)))
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.phone.includes(searchTerm) ||
      (request.order_id && request.order_id.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    const matchesAssignee = assigneeFilter === 'all' || request.assignee === assigneeFilter
    
    // Date filtering
    let matchesDate = true
    if (dateFilter.startDate) {
      const startDate = new Date(dateFilter.startDate)
      const requestDate = new Date(request.created_at)
      matchesDate = requestDate >= startDate
    }
    if (dateFilter.endDate && matchesDate) {
      const endDate = new Date(dateFilter.endDate + 'T23:59:59') // Include entire end date
      const requestDate = new Date(request.created_at)
      matchesDate = requestDate <= endDate
    }

    return matchesSearch && matchesStatus && matchesAssignee && matchesDate
  })

  // Pagination (50 per page)
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pagedRequests = filteredRequests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const pageStart = filteredRequests.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(safePage * PAGE_SIZE, filteredRequests.length)

  // Reset to the first page whenever the filters change.
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, assigneeFilter, dateFilter.startDate, dateFilter.endDate])

  const getStatusIcon = (status: Request['status']) => {
    const statusObj = statuses.find(s => s.value === status)
    const Icon = statusObj?.icon || Clock
    return <Icon className={`w-4 h-4 ${statusObj?.color}`} />
  }

  const getStatusLabel = (status: Request['status']) => {
    const statusObj = statuses.find(s => s.value === status)
    return statusObj?.label || status
  }

  const getRequestNotes = (requestId: string) => {
    return notes.filter(note => note.request_id === requestId)
  }

  const openMediaModal = (url: string, type: 'image' | 'video') => {
    console.log('Opening media modal:', { url, type })
    setMediaUrl(url)
    setMediaType(type)
    setShowMediaModal(true)
  }

  const generateReport = () => {
    // Filter requests based on selected statuses and current filters
    const filteredData = filteredRequests.filter(request => 
      selectedStatuses.has(request.status)
    )
    
    setReportRequests(filteredData)
    setShowReportPage(true)
  }

  const exportReportToExcel = () => {
    if (reportRequests.length === 0) return
    
    // Create Excel-like data structure
    const headers = [
      'ID', 'Name', 'Email', 'Phone', 'Order ID', 'Status', 'Assignee', 
      'Created Date', 'Updated Date', 'Comment', 'Image URL', 'Video URL'
    ]
    
    const excelData = [
      headers,
      ...reportRequests.map((req: Request) => [
        req.id,
        req.name,
        req.email,
        req.phone,
        req.order_id || 'No Order ID',
        req.status,
        req.assignee || 'Unassigned',
        new Date(req.created_at).toLocaleDateString(),
        new Date(req.updated_at).toLocaleDateString(),
        req.comment,
        req.image_url || '',
        req.video_url || ''
      ])
    ]
    
    // Convert to CSV (Excel can open CSV files)
    const csvContent = excelData.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requests-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header + summary (one slim bar) */}
        <div className="bg-white rounded-xl shadow-sm px-3 py-2 mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 mr-auto">
            <div className="p-1.5 bg-yellow-100 rounded-lg">
              <MessageSquare className="w-4 h-4 text-yellow-600" />
            </div>
            <h1 className="text-base font-bold text-gray-900">{tl('طلبات العملاء', 'Customer Requests')}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statuses.map(status => {
              const count = requests.filter(r => r.status === status.value).length
              return (
                <span key={status.value} className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-gray-50 border border-gray-100 text-sm">
                  <span className={`w-2 h-2 rounded-full ${
                    status.value === 'pending' ? 'bg-yellow-400' :
                    status.value === 'process' ? 'bg-blue-400' :
                    status.value === 'approved' ? 'bg-green-400' :
                    'bg-red-400'
                  }`}></span>
                  <span className="font-bold text-gray-900">{count}</span>
                  <span className="text-xs text-gray-500">{status.label}</span>
                </span>
              )
            })}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{tl('طلب جديد', 'Create New Request')}</span>
          </button>
        </div>

         {/* Filters and Search */}
         <div className="bg-white rounded-xl shadow-sm p-3 mb-2">
           <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={tl('ابحث بالاسم أو البريد أو الهاتف...', 'Search by name, email, or phone...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{tl('كل الحالات', 'All Statuses')}</option>
              {statuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{tl('كل المسؤولين', 'All Assignees')}</option>
              {assignees.map(assignee => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={tl('من تاريخ', 'Start Date')}
            />

            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={tl('إلى تاريخ', 'End Date')}
            />

            <div className="text-sm text-gray-600 flex items-center justify-center">
              {tl('إجمالي الطلبات:', 'Total Requests:')} {filteredRequests.length}
            </div>
          </div>
          
          {/* Filter Actions */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4">
              <button
                                 onClick={() => {
                   setDateFilter({ startDate: '', endDate: '' })
                   setStatusFilter('all')
                   setAssigneeFilter('all')
                   setSearchTerm('')
                 }}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                {tl('مسح كل الفلاتر', 'Clear All Filters')}
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={generateReport}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span>{tl('إنشاء تقرير', 'Generate Report')}</span>
              </button>
            </div>
          </div>
        </div>

                 {/* Bulk Actions */}
         {selectedRequests.size > 0 && (
           <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
             <div className="flex items-center justify-between">
               <div className="text-blue-900">
                 <strong>{selectedRequests.size}</strong> {tl('طلب محدد', 'request(s) selected')}
               </div>
               <div className="flex items-center space-x-4">
                 <div className="flex items-center space-x-2">
                   <label className="text-sm font-medium text-blue-900">{tl('الحالة:', 'Status:')}</label>
                   <select
                     value={bulkStatus}
                     onChange={(e) => setBulkStatus(e.target.value as Request['status'])}
                     className="text-sm border border-blue-300 rounded px-2 py-1"
                   >
                     {statuses.map(status => (
                       <option key={status.value} value={status.value}>
                         {status.label}
                       </option>
                     ))}
                   </select>
                   <button
                     onClick={bulkUpdateStatus}
                     className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                   >
                     {tl('تحديث الحالة', 'Update Status')}
                   </button>
                 </div>
                 <div className="flex items-center space-x-2">
                   <label className="text-sm font-medium text-blue-900">{tl('المسؤول:', 'Assignee:')}</label>
                   <select
                     value={bulkAssignee}
                     onChange={(e) => setBulkAssignee(e.target.value)}
                     className="text-sm border border-blue-300 rounded px-2 py-1"
                   >
                     <option value="">{tl('اختر المسؤول', 'Select Assignee')}</option>
                     {assignees.map(assignee => (
                       <option key={assignee} value={assignee}>
                         {assignee}
                       </option>
                     ))}
                   </select>
                   <button
                     onClick={bulkUpdateAssignee}
                     disabled={!bulkAssignee}
                     className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
                   >
                     {tl('تعيين', 'Assign')}
                   </button>
                 </div>
                 <button
                   onClick={bulkDeleteSelected}
                   disabled={selectedRequests.size === 0}
                   className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
                 >
                   {tl('حذف المحدد', 'Delete Selected')} ({selectedRequests.size})
                 </button>
                 <button
                   onClick={() => setSelectedRequests(new Set())}
                   className="text-blue-600 hover:text-blue-800 text-sm"
                 >
                   {tl('إلغاء التحديد', 'Clear Selection')}
                 </button>
               </div>
             </div>
           </div>
         )}

         {/* Requests List */}
         <div className="bg-white rounded-xl shadow-sm overflow-hidden">
           <div className="w-full">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-10" />
                <col className="w-[23%]" />
                <col className="w-[9%]" />
                <col className="w-[15%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
              </colgroup>
                             <thead className="bg-gray-50">
                 <tr>
                   <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     <input
                       type="checkbox"
                       checked={selectedRequests.size === filteredRequests.length && filteredRequests.length > 0}
                       onChange={selectAllRequests}
                       className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                     />
                   </th>
                   <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {tl('العميل', 'Customer')}
                   </th>
                   <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {tl('رقم الطلب', 'Order ID')}
                   </th>
                   <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {tl('بيانات التواصل', 'Contact Info')}
                   </th>
                   <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {tl('الحالة', 'Status')}
                   </th>
                   <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {tl('المسؤول', 'Assignee')}
                   </th>
                   <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {tl('التاريخ', 'Date')}
                   </th>
                   <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {tl('المرفقات', 'Attachments')}
                   </th>
                   <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {tl('إجراءات', 'Actions')}
                   </th>
                 </tr>
               </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                                 {pagedRequests.map((request) => (
                   <tr key={request.id} className="hover:bg-gray-50">
                     <td className="px-3 py-3 align-top">
                       <input
                         type="checkbox"
                         checked={selectedRequests.has(request.id)}
                         onChange={() => toggleRequestSelection(request.id)}
                         className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                       />
                     </td>
                     <td className="px-3 py-3 align-top">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {request.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate cursor-help" title={request.comment}>
                            {request.comment}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="text-sm text-gray-900 min-w-0">
                        {request.order_id ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Hash className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="font-mono text-blue-600 text-xs truncate" title={request.order_id}>{request.order_id}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">{tl('لا يوجد رقم طلب', 'No order ID')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="text-sm text-gray-900 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate text-xs" title={request.email}>{request.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate text-xs" title={request.phone}>{request.phone}</span>
                        </div>
                      </div>
                    </td>
                                         <td className="px-3 py-3 align-top">
                       <div className="flex items-center gap-1.5 min-w-0">
                         <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                           request.status === 'pending' ? 'bg-yellow-400' :
                           request.status === 'process' ? 'bg-blue-400' :
                           request.status === 'approved' ? 'bg-green-400' :
                           'bg-red-400'
                         }`}></div>
                         <select
                           value={request.status}
                           onChange={(e) => updateRequest(request.id, { status: e.target.value as Request['status'] })}
                           className={`w-full min-w-0 text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                             request.status === 'pending' ? 'text-yellow-600' :
                             request.status === 'process' ? 'text-blue-600' :
                             request.status === 'approved' ? 'text-green-600' :
                             'text-red-600'
                           }`}
                         >
                           {statuses.map(status => (
                             <option key={status.value} value={status.value}>
                               {status.label}
                             </option>
                           ))}
                         </select>
                       </div>
                     </td>
                                         <td className="px-3 py-3 align-top">
                       <div className="flex items-center gap-1.5 min-w-0">
                         <select
                           value={request.assignee || ''}
                           onChange={(e) => updateRequest(request.id, { assignee: e.target.value || null })}
                           className="w-full min-w-0 text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         >
                           <option value="">{tl('غير مُعيّن', 'Unassigned')}</option>
                           {assignees.map(assignee => (
                             <option key={assignee} value={assignee}>
                               {assignee}
                             </option>
                           ))}
                         </select>
                       </div>
                     </td>
                                         <td className="px-3 py-3 align-top">
                       <div className="text-xs text-gray-900 whitespace-nowrap">
                         {new Date(request.created_at).toLocaleDateString('en-US')}
                       </div>
                       <div className="text-xs text-gray-500 whitespace-nowrap">
                         {new Date(request.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                       </div>
                     </td>
                     <td className="px-3 py-3 align-top">
                       <div className="flex items-center gap-1.5">
                         {request.image_url && (
                           <div className="relative group">
                             <img
                               src={request.image_url}
                               alt="Request attachment"
                               className="w-10 h-10 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                               onClick={() => request.image_url && openMediaModal(request.image_url, 'image')}
                             />
                             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                               <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                             </div>
                           </div>
                         )}
                         {request.video_url && (
                           <div className="relative group">
                             <div className="w-10 h-10 bg-gray-100 rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center">
                               <Play className="w-5 h-5 text-gray-600" />
                             </div>
                             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                               <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                             </div>
                             <button
                               onClick={() => request.video_url && openMediaModal(request.video_url, 'video')}
                               className="absolute inset-0 w-full h-full"
                             />
                           </div>
                         )}
                         {!request.image_url && !request.video_url && (
                           <span className="text-xs text-gray-400 italic">{tl('لا يوجد', 'None')}</span>
                         )}
                       </div>
                     </td>
                     <td className="px-3 py-3 align-top text-sm font-medium">
                       <div className="flex items-center gap-0.5">
                         <button
                           onClick={() => {
                             setNewNote('')
                             setNoteImageFile(null)
                             setSelectedRequest(request)
                             setShowDetailModal(true)
                           }}
                           className="text-blue-600 hover:text-blue-900 p-1"
                           title={tl('عرض التفاصيل', 'View Details')}
                         >
                           <Eye className="w-4 h-4" />
                         </button>
                         <button
                           onClick={() => {
                             setNewNote('')
                             setNoteImageFile(null)
                             setSelectedRequest(request)
                             setShowDetailModal(true)
                             // Focus on notes section
                             setTimeout(() => {
                               const notesInput = document.querySelector('input[data-note-input="1"]') as HTMLInputElement
                               if (notesInput) notesInput.focus()
                             }, 100)
                           }}
                           className="text-green-600 hover:text-green-900 p-1"
                           title={tl('إضافة ملاحظة', 'Add Note')}
                         >
                           <FileText className="w-4 h-4" />
                         </button>
                         <button
                           onClick={() => sendRequestToRepair(request)}
                           disabled={!request.order_id || repairBusyId === request.id}
                           className="text-purple-600 hover:text-purple-900 p-1 disabled:opacity-40 disabled:cursor-not-allowed"
                           title={tl('إرسال الطلب للتصليح (كريم)', 'Send order to repair (Karim)')}
                         >
                           <Wrench className="w-4 h-4" />
                         </button>
                         <button
                           onClick={() => deleteRequest(request.id)}
                           className="text-red-600 hover:text-red-900 p-1"
                           title={tl('حذف الطلب', 'Delete Request')}
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagedRequests.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500">{tl('لا توجد طلبات مطابقة للفلاتر الحالية', 'No requests match the current filters')}</div>
          )}

          {/* Pagination */}
          {filteredRequests.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {tl('عرض', 'Showing')} {pageStart}–{pageEnd} {tl('من', 'of')} {filteredRequests.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage <= 1}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  « {tl('الأول', 'First')}
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ‹ {tl('السابق', 'Prev')}
                </button>
                <span className="px-3 py-1.5 text-xs font-semibold text-gray-700">
                  {tl('صفحة', 'Page')} {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {tl('التالي', 'Next')} ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage >= totalPages}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {tl('الأخير', 'Last')} »
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedRequest && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {tl('تفاصيل الطلب', 'Request Details')} #{selectedRequest.id}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (confirm(tl('هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.', 'Are you sure you want to delete this request? This action cannot be undone.'))) {
                          deleteRequest(selectedRequest.id)
                          setShowDetailModal(false)
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-1"
                      title={tl('حذف الطلب', 'Delete Request')}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{tl('حذف', 'Delete')}</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailModal(false)
                        setNewNote('')
                        setNoteImageFile(null)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Request Details */}
                                     <div>
                     <h3 className="text-lg font-semibold text-gray-900 mb-4">{tl('بيانات الطلب', 'Request Information')}</h3>
                     <div className="space-y-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">{tl('الاسم', 'Name')}</label>
                         <input
                           type="text"
                           value={selectedRequest.name}
                           onChange={(e) => setSelectedRequest({...selectedRequest, name: e.target.value})}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         />
                       </div>
                       
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">{tl('البريد الإلكتروني', 'Email')}</label>
                         <input
                           type="email"
                           value={selectedRequest.email}
                           onChange={(e) => setSelectedRequest({...selectedRequest, email: e.target.value})}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         />
                       </div>
                       
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">{tl('الهاتف', 'Phone')}</label>
                         <input
                           type="text"
                           value={selectedRequest.phone}
                           onChange={(e) => setSelectedRequest({...selectedRequest, phone: e.target.value})}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         />
                       </div>
                       
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">{tl('رقم الطلب', 'Order ID')}</label>
                         <input
                           type="text"
                           value={selectedRequest.order_id || ''}
                           onChange={(e) => setSelectedRequest({...selectedRequest, order_id: e.target.value || null})}
                           placeholder={tl('أدخل رقم طلب Shopify', 'Enter Shopify order ID')}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         />
                       </div>
                       
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">{tl('تعليق', 'Comment')}</label>
                         <textarea
                           value={selectedRequest.comment}
                           onChange={(e) => setSelectedRequest({...selectedRequest, comment: e.target.value})}
                           rows={3}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         />
                       </div>
                     </div>
                   </div>

                  {/* Status and Assignment */}
                                     <div>
                     <h3 className="text-lg font-semibold text-gray-900 mb-4">{tl('الحالة والتعيين', 'Status & Assignment')}</h3>
                     <div className="space-y-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">{tl('الحالة', 'Status')}</label>
                         <select
                           value={selectedRequest.status}
                           onChange={(e) => setSelectedRequest({...selectedRequest, status: e.target.value as Request['status']})}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         >
                           {statuses.map(status => (
                             <option key={status.value} value={status.value}>
                               {status.label}
                             </option>
                           ))}
                         </select>
                       </div>
                       
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">{tl('المسؤول', 'Assignee')}</label>
                         <select
                           value={selectedRequest.assignee || ''}
                           onChange={(e) => setSelectedRequest({...selectedRequest, assignee: e.target.value || null})}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         >
                           <option value="">{tl('اختر المسؤول', 'Select Assignee')}</option>
                           {assignees.map(assignee => (
                             <option key={assignee} value={assignee}>
                               {assignee}
                             </option>
                           ))}
                         </select>
                       </div>

                                               {selectedRequest.image_url && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{tl('صورة مرفقة', 'Attached Image')}</label>
                            <div className="relative group">
                              <img 
                                src={selectedRequest.image_url} 
                                alt="Request attachment" 
                                className="w-full h-32 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => openMediaModal(selectedRequest.image_url!, 'image')}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                            <div className="mt-2 flex items-center space-x-2">
                              <button
                                onClick={() => openMediaModal(selectedRequest.image_url!, 'image')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-2"
                              >
                                <Eye className="w-4 h-4" />
                                <span>{tl('عرض بالحجم الكامل', 'View Full Size')}</span>
                              </button>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            {imageFile && (
                              <div className="text-sm text-green-600 flex items-center justify-between bg-green-50 p-2 rounded-lg mt-2">
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>{imageFile.name}</span>
                                  <span className="text-xs text-gray-500">({(imageFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFile('image')}
                                  className="text-red-600 hover:text-red-800"
                                  title={tl('إزالة الملف', 'Remove file')}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {selectedRequest.video_url && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{tl('فيديو مرفق', 'Attached Video')}</label>
                            <div className="relative group">
                              <video 
                                src={selectedRequest.video_url} 
                                controls
                                className="w-full h-32 rounded-lg border border-gray-300"
                              >
                                {tl('متصفحك لا يدعم تشغيل الفيديو.', 'Your browser does not support the video tag.')}
                              </video>
                            </div>
                            <div className="mt-2 flex items-center space-x-2">
                              <button
                                onClick={() => openMediaModal(selectedRequest.video_url!, 'video')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-2"
                              >
                                <Eye className="w-4 h-4" />
                                <span>{tl('عرض بالحجم الكامل', 'View Full Size')}</span>
                              </button>
                              <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            {videoFile && (
                              <div className="text-sm text-green-600 flex items-center justify-between bg-green-50 p-2 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>{videoFile.name}</span>
                                  <span className="text-xs text-gray-500">({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFile('video')}
                                  className="text-red-600 hover:text-red-800"
                                  title={tl('إزالة الملف', 'Remove file')}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                     </div>
                   </div>
                </div>

                {/* Notes Section */}
                                 <div className="mt-8">
                   <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes & Attachments</h3>
                   <div className="space-y-4">
                     <div className="space-y-3">
                       <div className="flex space-x-2">
                         <input
                           type="text"
                           data-note-input="1"
                           placeholder={tl('أضف نص ملاحظة (اختياري)...', 'Add note text (optional)...')}
                           value={newNote}
                           onChange={(e) => setNewNote(e.target.value)}
                           onKeyDown={(e) => {
                             if (e.key === 'Enter' && (newNote.trim() || noteImageFile)) {
                               e.preventDefault()
                               addNote()
                             }
                           }}
                           className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         />
                         <button
                           onClick={addNote}
                           disabled={!newNote.trim() && !noteImageFile}
                           className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
                         >
                           {tl('إضافة ملاحظة', 'Add Note')}
                         </button>
                       </div>
                       
                       {/* Note Image Upload */}
                       <div className="flex items-center space-x-2">
                         <input
                           type="file"
                           accept="image/*"
                           onChange={(e) => setNoteImageFile(e.target.files?.[0] || null)}
                           className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder={tl('أضف صورة (اختياري)', 'Add image (optional)')}
                         />
                         {noteImageFile && (
                           <button
                             onClick={removeNoteImage}
                             className="text-red-600 hover:text-red-800 p-2"
                             title={tl('إزالة الصورة', 'Remove image')}
                           >
                             <X className="w-4 h-4" />
                           </button>
                         )}
                       </div>
                       
                       {/* Note Image Preview */}
                       {noteImageFile && (
                         <div className="text-sm text-green-600 flex items-center justify-between bg-green-50 p-2 rounded-lg">
                           <div className="flex items-center space-x-2">
                             <CheckCircle className="w-4 h-4" />
                             <span>{noteImageFile.name}</span>
                             <span className="text-xs text-gray-500">({(noteImageFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                           </div>
                         </div>
                       )}
                       
                       {/* Help Text */}
                       <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                         💡 <strong>{tl('ملاحظة:', 'Tip:')}</strong> {tl('يمكنك إضافة ملاحظة بنص فقط أو صورة فقط أو الاثنين معًا.', 'You can add a note with text only, image only, or both text and image.')}
                       </div>
                     </div>
                     
                     <div className="space-y-3">
                       {getRequestNotes(selectedRequest.id).map((note) => {
                         console.log('Rendering note:', note)
                         return (
                           <div key={note.id} className="bg-gray-50 p-4 rounded-lg">
                             <div className="flex items-start justify-between mb-2">
                               <div className="flex items-center space-x-2">
                                 {note.note && note.note.trim() ? (
                                   <span className="text-sm text-gray-900">{note.note}</span>
                                 ) : (
                                   <span className="text-sm text-gray-500 italic">{tl('صورة مرفقة فقط', 'Image attachment only')}</span>
                                 )}
                                 {note.image_url && (
                                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                     📷 {tl('صورة', 'Image')}
                                   </span>
                                 )}
                               </div>
                               <span className="text-xs text-gray-500 ml-2">
                                 {new Date(note.created_at).toLocaleString('en-US')}
                               </span>
                             </div>
                             
                             {/* Display note image if exists */}
                             {note.image_url && (
                               <div className="mt-3">
                                 <div className="relative group">
                                   <img 
                                     src={note.image_url} 
                                     alt="Note attachment" 
                                     className="w-32 h-24 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                                     onClick={() => {
                                       console.log('Note image clicked:', note.image_url)
                                       openMediaModal(note.image_url!, 'image')
                                     }}
                                     onError={(e) => console.error('Note image failed to load:', note.image_url, e)}
                                   />
                                   <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                     <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                   </div>
                                 </div>
                                 <button
                                   onClick={() => {
                                     console.log('Note image view button clicked:', note.image_url)
                                     openMediaModal(note.image_url!, 'image')
                                   }}
                                   className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors flex items-center space-x-1"
                                 >
                                   <Eye className="w-3 h-3" />
                                   <span>{tl('عرض بالحجم الكامل', 'View Full Size')}</span>
                                 </button>
                               </div>
                             )}
                             
                             <div className="text-xs text-gray-500 mt-2">
                               {tl('بواسطة:', 'By:')} {note.author}
                             </div>
                           </div>
                         )
                       })}
                     </div>
                   </div>
                 </div>
              </div>

                             <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                 <button
                   onClick={() => {
                     setShowDetailModal(false)
                     setNewNote('')
                     setNoteImageFile(null)
                   }}
                   className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                 >
                   {tl('إلغاء', 'Cancel')}
                 </button>
                 <button
                   onClick={() => {
                     updateRequest(selectedRequest.id, selectedRequest)
                     setShowDetailModal(false)
                     setNewNote('')
                     setNoteImageFile(null)
                   }}
                   disabled={uploading}
                   className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                 >
                   {uploading ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                       <span>{tl('جارٍ الحفظ...', 'Saving...')}</span>
                     </>
                   ) : (
                     <span>{tl('حفظ التغييرات', 'Save Changes')}</span>
                   )}
                 </button>
               </div>
            </div>
          </div>,
          document.body
        )}

        {/* Create Request Modal */}
        {showCreateModal && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full">
                             <div className="p-6 border-b border-gray-200">
                 <h2 className="text-xl font-bold text-gray-900">{tl('طلب جديد', 'Create New Request')}</h2>
               </div>

              <div className="p-6">
                <div className="space-y-4">
                                     <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{tl('الاسم *', 'Name *')}</label>
                     <input
                       type="text"
                       value={formData.name}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       required
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{tl('البريد الإلكتروني *', 'Email *')}</label>
                     <input
                       type="email"
                       value={formData.email}
                       onChange={(e) => setFormData({...formData, email: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       required
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{tl('الهاتف *', 'Phone *')}</label>
                     <input
                       type="text"
                       value={formData.phone}
                       onChange={(e) => setFormData({...formData, phone: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       required
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{tl('رقم الطلب (اختياري)', 'Order ID (Optional)')}</label>
                     <input
                       type="text"
                       value={formData.order_id}
                       onChange={(e) => setFormData({...formData, order_id: e.target.value})}
                       placeholder={tl('أدخل رقم طلب Shopify', 'Enter Shopify order ID')}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{tl('تعليق *', 'Comment *')}</label>
                     <textarea
                       value={formData.comment}
                       onChange={(e) => setFormData({...formData, comment: e.target.value})}
                       rows={3}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       required
                     />
                   </div>
                   
                                        <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">{tl('رفع صورة (اختياري)', 'Image Upload (Optional)')}</label>
                       <div className="space-y-2">
                         <input
                           type="file"
                           accept="image/*"
                           onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         />
                         {imageFile && (
                           <div className="text-sm text-green-600 flex items-center justify-between bg-green-50 p-2 rounded-lg">
                             <div className="flex items-center space-x-2">
                               <CheckCircle className="w-4 h-4" />
                               <span>{imageFile.name}</span>
                               <span className="text-xs text-gray-500">({(imageFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                             </div>
                             <button
                               type="button"
                               onClick={() => removeFile('image')}
                               className="text-red-600 hover:text-red-800"
                               title={tl('إزالة الملف', 'Remove file')}
                             >
                               <X className="w-4 h-4" />
                             </button>
                           </div>
                         )}
                         {formData.image_url && !imageFile && (
                           <div className="text-sm text-gray-600">
                             {tl('أو استخدم الرابط الحالي:', 'Or use existing URL:')} {formData.image_url}
                           </div>
                         )}
                         <div className="text-xs text-gray-500">
                           {tl('الصيغ المدعومة: JPEG, PNG, GIF, WebP. الحد الأقصى: 5MB', 'Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB')}
                         </div>
                       </div>
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">{tl('رفع فيديو (اختياري)', 'Video Upload (Optional)')}</label>
                       <div className="space-y-2">
                         <input
                           type="file"
                           accept="video/*"
                           onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         />
                         {videoFile && (
                           <div className="text-sm text-green-600 flex items-center justify-between bg-green-50 p-2 rounded-lg">
                             <div className="flex items-center space-x-2">
                               <CheckCircle className="w-4 h-4" />
                               <span>{videoFile.name}</span>
                               <span className="text-xs text-gray-500">({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                             </div>
                             <button
                               type="button"
                               onClick={() => removeFile('video')}
                               className="text-red-600 hover:text-red-800"
                               title={tl('إزالة الملف', 'Remove file')}
                             >
                               <X className="w-4 h-4" />
                             </button>
                           </div>
                         )}
                         {formData.video_url && !videoFile && (
                           <div className="text-sm text-gray-600">
                             {tl('أو استخدم الرابط الحالي:', 'Or use existing URL:')} {formData.video_url}
                           </div>
                         )}
                         <div className="text-xs text-gray-500">
                           {tl('الصيغ المدعومة: MP4, WebM, OGG, AVI. الحد الأقصى: 50MB', 'Supported formats: MP4, WebM, OGG, AVI. Max size: 50MB')}
                         </div>
                       </div>
                     </div>
                </div>
              </div>

                             <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                 <button
                   onClick={() => setShowCreateModal(false)}
                   className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                 >
                   {tl('إلغاء', 'Cancel')}
                 </button>
                 <button
                   onClick={createRequest}
                   disabled={!formData.name || !formData.email || !formData.phone || !formData.comment || uploading}
                   className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                 >
                   {uploading ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                       <span>{tl('جارٍ الإنشاء...', 'Creating...')}</span>
                     </>
                   ) : (
                     <span>{tl('إنشاء الطلب', 'Create Request')}</span>
                   )}
                 </button>
               </div>
            </div>
          </div>,
          document.body
        )}

        {/* Report Page */}
        {showReportPage && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
            <div className="min-h-screen">
              {/* Header */}
              <div className="bg-white border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{tl('إنشاء تقرير', 'Generate Report')}</h1>
                    <p className="text-gray-600 mt-1">{tl('اختر الحالات وأنشئ تقريرًا مفصلاً', 'Select statuses and generate detailed report')}</p>
                  </div>
                  <button
                    onClick={() => setShowReportPage(false)}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Status Selection */}
              <div className="p-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">{tl('اختر الحالات المضمّنة', 'Select Statuses to Include')}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {statuses.map(status => (
                      <label key={status.value} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.has(status.value)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedStatuses)
                            if (e.target.checked) {
                              newSelected.add(status.value)
                            } else {
                              newSelected.delete(status.value)
                            }
                            setSelectedStatuses(newSelected)
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            status.value === 'pending' ? 'bg-yellow-400' :
                            status.value === 'process' ? 'bg-blue-400' :
                            status.value === 'approved' ? 'bg-green-400' :
                            'bg-red-400'
                          }`}></div>
                          <span className="text-sm text-gray-700">{status.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex items-center space-x-4">
                    <button
                      onClick={() => setSelectedStatuses(new Set(['pending', 'process', 'approved', 'cancelled']))}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      {tl('تحديد الكل', 'Select All')}
                    </button>
                    <button
                      onClick={() => setSelectedStatuses(new Set())}
                      className="text-sm text-red-600 hover:text-red-800 underline"
                    >
                      {tl('مسح الكل', 'Clear All')}
                    </button>
                  </div>
                </div>

                {/* Generate Report Button */}
                <div className="text-center mb-6">
                  <button
                    onClick={generateReport}
                    disabled={selectedStatuses.size === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors disabled:cursor-not-allowed"
                  >
                    {tl('إنشاء تقرير', 'Generate Report')} ({reportRequests.length} {tl('طلب', 'requests')})
                  </button>
                </div>

                {/* Report Results */}
                {reportRequests.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {tl('نتائج التقرير', 'Report Results')} ({reportRequests.length} {tl('طلب', 'requests')})
                        </h3>
                        <button
                          onClick={exportReportToExcel}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <FileText className="w-4 h-4" />
                          <span>{tl('تصدير إلى Excel', 'Export to Excel')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Requests Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {tl('العميل', 'Customer')}
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {tl('بيانات التواصل', 'Contact Info')}
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {tl('الحالة', 'Status')}
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {tl('المسؤول', 'Assignee')}
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {tl('التواريخ', 'Dates')}
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {tl('تعليق', 'Comment')}
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {tl('المرفقات', 'Attachments')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportRequests.map((request) => (
                            <tr key={request.id} className="hover:bg-gray-50">
                              <td className="px-3 py-3 align-top">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                      <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {request.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {tl('المعرّف:', 'ID:')} {request.id}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 align-top">
                                <div className="text-sm text-gray-900">
                                  <div className="flex items-center space-x-2">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span>{request.email}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span>{request.phone}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 align-top">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-3 h-3 rounded-full ${
                                    request.status === 'pending' ? 'bg-yellow-400' :
                                    request.status === 'process' ? 'bg-blue-400' :
                                    request.status === 'approved' ? 'bg-green-400' :
                                    'bg-red-400'
                                  }`}></div>
                                  <span className="text-sm text-gray-900 capitalize">{getStatusLabel(request.status)}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 align-top">
                                <div className="text-sm text-gray-900">
                                  {request.assignee || tl('غير مُعيّن', 'Unassigned')}
                                </div>
                              </td>
                              <td className="px-3 py-3 align-top">
                                <div className="text-sm text-gray-900">
                                  <div>{tl('تاريخ الإنشاء:', 'Created:')} {new Date(request.created_at).toLocaleDateString()}</div>
                                  <div className="text-gray-500">{tl('تاريخ التحديث:', 'Updated:')} {new Date(request.updated_at).toLocaleDateString()}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-xs">
                                  {request.comment}
                                </div>
                              </td>
                              <td className="px-3 py-3 align-top">
                                <div className="text-sm text-gray-900">
                                  {request.image_url && (
                                    <div className="mb-1">
                                      <span className="text-blue-600">📷 {tl('صورة', 'Image')}</span>
                                    </div>
                                  )}
                                  {request.video_url && (
                                    <div>
                                      <span className="text-purple-600">🎥 {tl('فيديو', 'Video')}</span>
                                    </div>
                                  )}
                                  {!request.image_url && !request.video_url && (
                                    <span className="text-gray-400">{tl('لا يوجد', 'None')}</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Media Modal */}
        {showMediaModal && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-6xl w-full max-h-[90vh]">
              <button
                onClick={() => setShowMediaModal(false)}
                className="absolute top-4 right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center justify-center h-full">
                {mediaType === 'image' ? (
                  <img 
                    src={mediaUrl} 
                    alt="Full size image" 
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <video 
                    src={mediaUrl} 
                    controls
                    autoPlay
                    className="max-w-full max-h-full rounded-lg"
                  >
                    {tl('متصفحك لا يدعم تشغيل الفيديو.', 'Your browser does not support the video tag.')}
                  </video>
                )}
              </div>
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
                <span className="text-sm">
                  {mediaType === 'image' ? tl('📷 صورة', '📷 Image') : tl('🎥 فيديو', '🎥 Video')} - {tl('انقر خارجًا أو اضغط ESC للإغلاق', 'Click outside or press ESC to close')}
                </span>
              </div>
            </div>
            {/* Click outside to close */}
            <div
              className="absolute inset-0 -z-10"
              onClick={() => setShowMediaModal(false)}
            />
          </div>,
          document.body
        )}

        {/* Repair item picker (order has more than one item) */}
        {repairModal && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={() => !repairSaving && setRepairModal(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-gray-900">{tl('اختر المنتج للتصليح', 'Choose item to repair')}</h3>
                </div>
                <button onClick={() => !repairSaving && setRepairModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5">
                <div className="text-sm text-gray-500 mb-3">
                  {tl('الطلب', 'Order')} <span className="font-mono text-purple-700">{repairModal.label}</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="repair-item"
                      checked={repairItemChoice === ''}
                      onChange={() => setRepairItemChoice('')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-900">{tl('الطلب كامل (كل المنتجات)', 'Whole order (all items)')}</span>
                  </label>
                  {repairModal.items.map((it: any, i: number) => (
                    <label key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-purple-50">
                      <input
                        type="radio"
                        name="repair-item"
                        checked={repairItemChoice === String(i)}
                        onChange={() => setRepairItemChoice(String(i))}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-800">{itemLabel(it)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => setRepairModal(null)}
                  disabled={repairSaving}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50"
                >
                  {tl('إلغاء', 'Cancel')}
                </button>
                <button
                  onClick={confirmRepairModal}
                  disabled={repairSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 text-sm disabled:opacity-50"
                >
                  <Wrench className="w-4 h-4" />
                  {repairSaving ? tl('جارٍ الإرسال...', 'Sending...') : tl('إرسال للتصليح', 'Send to repair')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}

export default RequestsManagement
