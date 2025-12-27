import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface Order {
  id: number;
  name: string;
  address: string;
  phone: string;
}

// No mock data, will fetch from Supabase

type SortKey = keyof Order;
type SortDirection = "asc" | "desc";


const getToday = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const LOCAL_STORAGE_KEY = "courier-orders-sorting";

const YourSheet: React.FC = () => {

  const { user } = useAuth();
  const [date, setDate] = useState(getToday());
  const [orders, setOrders] = useState<any[]>([]);
  const [manualSort, setManualSort] = useState(false);
  // Map of orderId to sort number
  const [sortNumbers, setSortNumbers] = useState<{ [id: string]: number }>({});
  // Map of orderId to note
  const [notes, setNotes] = useState<{ [id: string]: string }>({});
  // Track which note is expanded (orderId)
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // Load orders for selected date and courier
  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_id, customer_name, address, mobile_number, created_at, updated_at")
        .eq("assigned_courier_id", user.id)
        .gte("updated_at", `${date}T00:00:00`)
        .lte("updated_at", `${date}T23:59:59`)
        .order("updated_at", { ascending: true });
      let filtered = (data ?? []).map((o: any) => ({
        id: o.id,
        order_id: o.order_id,
        name: o.customer_name,
        address: o.address,
        phone: o.mobile_number,
        created_at: o.created_at,
      }));
      // If custom sort numbers exist for this date, apply them
      const savedSort = localStorage.getItem(`${LOCAL_STORAGE_KEY}-sortnums-${date}`);
      let sortNums: { [id: string]: number } = {};
      if (savedSort) {
        sortNums = JSON.parse(savedSort);
        setSortNumbers(sortNums);
        filtered = [...filtered].sort((a, b) => (sortNums[a.id] ?? 9999) - (sortNums[b.id] ?? 9999));
      } else {
        setSortNumbers({});
      }
      // Load notes from localStorage
      const savedNotes = localStorage.getItem(`${LOCAL_STORAGE_KEY}-notes-${date}`);
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      } else {
        setNotes({});
      }
      setOrders(filtered);
    };
    fetchOrders();
  }, [date, user]);
  // Save notes to localStorage
  const saveNotes = (notesObj: { [id: string]: string }) => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}-notes-${date}`, JSON.stringify(notesObj));
  };

  // Handle note change
  const handleNoteChange = (id: string, value: string) => {
    const newNotes = { ...notes, [id]: value };
    setNotes(newNotes);
    saveNotes(newNotes);
  };

  // Save custom order to localStorage
  const saveSortNumbers = (nums: { [id: string]: number }) => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}-sortnums-${date}`, JSON.stringify(nums));
  };

  // Handle manual sorting
  // Handle sort number change
  const handleSortNumberChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    const newSort = { ...sortNumbers, [id]: isNaN(num) ? 0 : num };
    setSortNumbers(newSort);
  };

  // Save sort numbers and re-sort
  const saveSortOrder = () => {
    saveSortNumbers(sortNumbers);
    setOrders((prev) => [...prev].sort((a, b) => (sortNumbers[a.id] ?? 9999) - (sortNumbers[b.id] ?? 9999)));
    setManualSort(false);
  };

  // UI: Date filter, Sorting button, Table
  return (
    <div className="p-2 sm:p-4 max-w-2xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center text-blue-700">ورقة الطلبات</h2>
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <label className="text-sm font-medium text-gray-700">تصفية بالتاريخ:</label>
        <input
          type="date"
          className="border rounded-lg px-2 py-1 text-sm focus:outline-blue-400 w-full sm:w-auto"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={getToday()}
        />
        {manualSort ? (
          <button
            className="w-full sm:w-auto px-4 py-2 rounded-lg font-bold text-white transition-all bg-green-600"
            onClick={saveSortOrder}
          >
            حفظ الترتيب
          </button>
        ) : (
          <button
            className="w-full sm:w-auto px-4 py-2 rounded-lg font-bold text-white transition-all bg-blue-600 hover:bg-blue-700"
            onClick={() => setManualSort(true)}
          >
            ترتيب يدوي
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl shadow-lg bg-white">
        <table className="min-w-full text-sm text-right rtl:text-right border-separate border-spacing-0">
          <thead className="bg-blue-100 text-blue-800">
            <tr>
              <th className="px-2 py-2 border-b-4 border-blue-400 font-bold">رقم الطلب</th>
              <th className="px-2 py-2 border-b-4 border-blue-400 font-bold">اسم العميل</th>
              <th className="px-2 py-2 border-b-4 border-blue-400 font-bold">العنوان</th>
              <th className="px-2 py-2 border-b-4 border-blue-400 font-bold">رقم الجوال</th>
              <th className="px-2 py-2 border-b-4 border-blue-400 font-bold text-center">ملاحظات</th>
              {manualSort && <th className="px-2 py-2 border-b-4 border-blue-400 font-bold text-center">ترتيب</th>}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={manualSort ? 5 : 4} className="text-center py-6 text-gray-400">لا توجد طلبات في هذا اليوم</td>
              </tr>
            ) : (
              orders
                .slice() // copy
                .sort((a, b) => {
                  if (!manualSort) return 0;
                  return (sortNumbers[a.id] ?? 9999) - (sortNumbers[b.id] ?? 9999);
                })
                .map((order, idx, arr) => (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-blue-50">
                      <td className="px-2 py-2 font-semibold text-blue-700 border-l-2 border-blue-200">{order.order_id || order.id}</td>
                      <td className="px-2 py-2 border-l-2 border-blue-200">{order.name}</td>
                      <td className="px-2 py-2 border-l-2 border-blue-200">{order.address}</td>
                      <td className="px-2 py-2 border-l-2 border-blue-200">{order.phone}</td>
                      <td className="px-2 py-2 border-l-2 border-blue-200">
                        <input
                          type="text"
                          className="w-full border-2 border-blue-400 rounded-lg px-2 py-1 text-sm cursor-pointer"
                          value={notes[order.id] ?? ""}
                          readOnly
                          onClick={() => setExpandedNoteId(order.id)}
                          placeholder="اكتب ملاحظة..."
                          aria-label="ملاحظة"
                        />
                      </td>
      {/* Note Modal */}
      {expandedNoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-4 w-80 max-w-full relative">
            <h3 className="text-lg font-bold mb-2 text-blue-700 text-center">ملاحظة الطلب</h3>
            <textarea
              className="w-full border-2 border-blue-400 rounded-lg px-2 py-1 text-sm resize-none mb-2"
              value={notes[expandedNoteId] ?? ""}
              onChange={e => handleNoteChange(expandedNoteId, e.target.value)}
              rows={5}
              placeholder="اكتب ملاحظتك هنا..."
              aria-label="ملاحظة"
              autoFocus
            />
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-blue-700 text-xl font-bold"
              onClick={() => setExpandedNoteId(null)}
              aria-label="إغلاق"
            >×</button>
            <button
              className="w-full mt-2 px-4 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700"
              onClick={() => setExpandedNoteId(null)}
            >حفظ وإغلاق</button>
          </div>
        </div>
      )}
                      {manualSort && (
                        <td className="px-2 py-2 flex gap-1 justify-center items-center border-l-2 border-blue-200">
                          <input
                            type="number"
                            min={1}
                            className="w-14 border-2 border-blue-400 rounded-lg px-2 py-1 text-sm text-center font-bold"
                            value={sortNumbers[order.id] ?? ""}
                            onChange={e => handleSortNumberChange(order.id, e.target.value)}
                            placeholder="رقم"
                            aria-label="ترتيب"
                          />
                        </td>
                      )}
                    </tr>
                    {idx < arr.length - 1 && (
                      <tr>
                        <td colSpan={manualSort ? 6 : 5}>
                          <hr className="border-t-2 border-blue-300 my-0" />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-xs text-gray-500 text-center">جميع الطلبات تظهر بوضوح ويمكنك ترتيبها يدوياً وحفظ الترتيب. الواجهة متوافقة مع الجوال.</div>
    </div>
  );
};

export default YourSheet;
