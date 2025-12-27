import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface Courier {
  id: string;
  name: string;
  email: string;
}

interface Order {
  id: number;
  order_id?: string;
  name: string;
  address: string;
  phone: string;
  created_at: string;
}

const getToday = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const LOCAL_STORAGE_KEY = "courier-orders-sorting";

const AdminCouriersSheet: React.FC = () => {
  const { user } = useAuth();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [date, setDate] = useState(getToday());
  const [orders, setOrders] = useState<Order[]>([]);
  const [manualSort, setManualSort] = useState(false);
  const [sortNumbers, setSortNumbers] = useState<{ [id: string]: number }>({});
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Fetch all couriers
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    const fetchCouriers = async () => {
      const { data } = await supabase
        .from("users")
        .select("id, name, email, role")
        .eq("role", "courier");
      setCouriers(data || []);
    };
    fetchCouriers();
  }, [user]);

  // Fetch orders for selected courier and date
  useEffect(() => {
    if (!selectedCourier) return;
    setLoadingOrders(true);
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_id, customer_name, address, mobile_number, created_at, updated_at")
        .eq("assigned_courier_id", selectedCourier.id)
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
      const savedSort = localStorage.getItem(`${LOCAL_STORAGE_KEY}-sortnums-${date}-admin-${selectedCourier.id}`);
      let sortNums: { [id: string]: number } = {};
      if (savedSort) {
        sortNums = JSON.parse(savedSort);
        setSortNumbers(sortNums);
        filtered = [...filtered].sort((a, b) => (sortNums[a.id] ?? 9999) - (sortNums[b.id] ?? 9999));
      } else {
        setSortNumbers({});
      }
      setOrders(filtered);
      setLoadingOrders(false);
    };
    fetchOrders();
  }, [selectedCourier, date]);

  // Save custom order to localStorage
  const saveSortNumbers = (nums: { [id: string]: number }) => {
    if (!selectedCourier) return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}-sortnums-${date}-admin-${selectedCourier.id}`, JSON.stringify(nums));
  };

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

  return (
    <div className="p-2 sm:p-4 max-w-3xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center text-blue-700">ورقة الطلبات لكل مندوب</h2>
      {!selectedCourier ? (
        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-700">اختر اسم المندوب لعرض طلباته:</h3>
          <ul className="space-y-2">
            {couriers.map((courier) => (
              <li key={courier.id}>
                <button
                  className="w-full text-right px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold shadow"
                  onClick={() => setSelectedCourier(courier)}
                >
                  {courier.name} <span className="text-xs text-gray-500">({courier.email})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
              onClick={() => setSelectedCourier(null)}
            >
              &larr; عودة
            </button>
            <span className="font-bold text-blue-700">{selectedCourier.name}</span>
            <span className="text-xs text-gray-500">({selectedCourier.email})</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
            <label htmlFor="admin-date-filter" className="text-sm font-medium text-gray-700">تصفية بالتاريخ:</label>
            <input
              id="admin-date-filter"
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
            {loadingOrders ? (
              <div className="text-center py-8 text-gray-400">جاري تحميل الطلبات...</div>
            ) : (
              <table className="min-w-full text-sm text-right rtl:text-right border-separate border-spacing-0">
                <thead className="bg-blue-100 text-blue-800">
                  <tr>
                    <th className="px-2 py-2 border-b-4 border-blue-400 font-bold">رقم الطلب</th>
                    <th className="px-2 py-2 border-b-4 border-blue-400 font-bold">اسم العميل</th>
                    <th className="px-2 py-2 border-b-4 border-blue-400 font-bold">العنوان</th>
                    <th className="px-2 py-2 border-b-4 border-blue-400 font-bold">رقم الجوال</th>
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
                      .slice()
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
                            {manualSort && (
                              <td className="px-2 py-2 flex gap-1 justify-center items-center border-l-2 border-blue-200">
                                <input
                                  type="number"
                                  min={1}
                                  className="w-14 border-2 border-blue-400 rounded-lg px-2 py-1 text-sm text-center font-bold"
                                  value={sortNumbers[order.id] ?? ""}
                                  onChange={e => handleSortNumberChange(order.id.toString(), e.target.value)}
                                  placeholder="رقم"
                                  aria-label="ترتيب"
                                />
                              </td>
                            )}
                          </tr>
                          {idx < arr.length - 1 && (
                            <tr>
                              <td colSpan={manualSort ? 5 : 4}>
                                <hr className="border-t-2 border-blue-300 my-0" />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-4 text-xs text-gray-500 text-center">جميع الطلبات تظهر بوضوح ويمكنك ترتيبها يدوياً وحفظ الترتيب.</div>
        </div>
      )}
    </div>
  );
};

export default AdminCouriersSheet;
