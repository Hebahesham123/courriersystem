# 📋 Summary Component Implementation Example

## Current Problem
When you scroll inside the "إجمالي الطلبات" card and navigate away, then return, the scroll position resets to the beginning.

## Solution
Add modal scroll preservation to your Summary component.

---

## 📝 Step-by-Step Implementation

### Step 1: Add Import

**File:** `src/components/Dashboard/Summary.tsx`

Add this import at the top of your file:

```tsx
import { useModalScrollPreserve } from "../../lib/useModalScrollPreserve"
```

### Step 2: Add Scroll Preservation Hooks

Inside your `Summary` component, add these hooks after your existing state declarations:

```tsx
const Summary: React.FC = () => {
  // ... your existing state and code ...
  
  // Add these new hooks for scroll preservation
  const ordersCardScroll = useModalScrollPreserve('summary-orders-card', {
    persistToLocalStorage: true,
    restoreDelay: 200
  });
  
  const requestsCardScroll = useModalScrollPreserve('summary-requests-card', {
    persistToLocalStorage: true,
    restoreDelay: 200
  });
  
  const couriersCardScroll = useModalScrollPreserve('summary-couriers-card', {
    persistToLocalStorage: true,
    restoreDelay: 200
  });

  // ... rest of your component code ...
```

### Step 3: Update Your Card Containers

Find your card containers and add the `ref` attribute:

```tsx
{/* Orders Card */}
<div className="bg-white rounded-lg shadow-md p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-900">إجمالي الطلبات</h3>
    <span className="text-2xl font-bold text-blue-600">{totalOrders}</span>
  </div>
  
  {/* Add ref to the scrollable content area */}
  <div 
    ref={ordersCardScroll.containerRef}
    className="overflow-y-auto max-h-64 space-y-3"
  >
    {orders.map((order) => (
      <div key={order.id} className="border-b pb-2">
        {/* Your order content */}
      </div>
    ))}
  </div>
</div>

{/* Requests Card */}
<div className="bg-white rounded-lg shadow-md p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-900">الطلبات</h3>
    <span className="text-2xl font-bold text-green-600">{totalRequests}</span>
  </div>
  
  {/* Add ref to the scrollable content area */}
  <div 
    ref={requestsCardScroll.containerRef}
    className="overflow-y-auto max-h-64 space-y-3"
  >
    {requests.map((request) => (
      <div key={request.id} className="border-b pb-2">
        {/* Your request content */}
      </div>
    ))}
  </div>
</div>

{/* Couriers Card */}
<div className="bg-white rounded-lg shadow-md p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-900">المندوبين</h3>
    <span className="text-2xl font-bold text-purple-600">{totalCouriers}</span>
  </div>
  
  {/* Add ref to the scrollable content area */}
  <div 
    ref={couriersCardScroll.containerRef}
    className="overflow-y-auto max-h-64 space-y-3"
  >
    {couriers.map((courier) => (
      <div key={courier.id} className="border-b pb-2">
        {/* Your courier content */}
      </div>
    ))}
  </div>
</div>
```

### Step 4: Add Scroll Control Buttons (Optional)

Add these buttons to give users control over scroll restoration:

```tsx
{/* Add this after your cards */}
<div className="fixed bottom-4 right-4 space-y-2">
  {/* Orders Card Scroll Control */}
  {ordersCardScroll.hasSavedPosition() && (
    <button
      onClick={ordersCardScroll.restoreScroll}
      className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600"
      title="استعادة موضع التمرير في الطلبات"
    >
      🔄
    </button>
  )}
  
  {/* Requests Card Scroll Control */}
  {requestsCardScroll.hasSavedPosition() && (
    <button
      onClick={requestsCardScroll.restoreScroll}
      className="bg-green-500 text-white p-2 rounded-full shadow-lg hover:bg-green-600"
      title="استعادة موضع التمرير في الطلبات"
    >
      🔄
    </button>
  )}
  
  {/* Couriers Card Scroll Control */}
  {couriersCardScroll.hasSavedPosition() && (
    <button
      onClick={couriersCardScroll.restoreScroll}
      className="bg-purple-500 text-white p-2 rounded-full shadow-lg hover:bg-purple-600"
      title="استعادة موضع التمرير في المندوبين"
    >
      🔄
    </button>
  )}
</div>
```

---

## 🔧 Complete Example

Here's how your Summary component should look:

```tsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { useDashboardScroll } from "../../lib/useDashboardFilters";
import { useModalScrollPreserve } from "../../lib/useModalScrollPreserve";

const Summary: React.FC = () => {
  // ... your existing state and code ...
  
  // Dashboard scroll preservation
  const { scrollPosition, resetScroll } = useDashboardScroll('admin-summary');
  
  // Card scroll preservation
  const ordersCardScroll = useModalScrollPreserve('summary-orders-card');
  const requestsCardScroll = useModalScrollPreserve('summary-requests-card');
  const couriersCardScroll = useModalScrollPreserve('summary-couriers-card');

  // ... your existing useEffect and functions ...

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Your existing dashboard content */}
      
      {/* Cards with scroll preservation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Orders Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">إجمالي الطلبات</h3>
            <span className="text-2xl font-bold text-blue-600">{totalOrders}</span>
          </div>
          
          <div 
            ref={ordersCardScroll.containerRef}
            className="overflow-y-auto max-h-64 space-y-3"
          >
            {orders.map((order) => (
              <div key={order.id} className="border-b pb-2">
                {/* Order content */}
              </div>
            ))}
          </div>
        </div>

        {/* Requests Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">الطلبات</h3>
            <span className="text-2xl font-bold text-green-600">{totalRequests}</span>
          </div>
          
          <div 
            ref={requestsCardScroll.containerRef}
            className="overflow-y-auto max-h-64 space-y-3"
          >
            {requests.map((request) => (
              <div key={request.id} className="border-b pb-2">
                {/* Request content */}
              </div>
            ))}
          </div>
        </div>

        {/* Couriers Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">المندوبين</h3>
            <span className="text-2xl font-bold text-purple-600">{totalCouriers}</span>
          </div>
          
          <div 
            ref={couriersCardScroll.containerRef}
            className="overflow-y-auto max-h-64 space-y-3"
          >
            {couriers.map((courier) => (
              <div key={courier.id} className="border-b pb-2">
                {/* Courier content */}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Control Buttons */}
      <div className="fixed bottom-4 right-4 space-y-2">
        {ordersCardScroll.hasSavedPosition() && (
          <button
            onClick={ordersCardScroll.restoreScroll}
            className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600"
            title="استعادة موضع التمرير في الطلبات"
          >
            🔄
          </button>
        )}
        
        {requestsCardScroll.hasSavedPosition() && (
          <button
            onClick={requestsCardScroll.restoreScroll}
            className="bg-green-500 text-white p-2 rounded-full shadow-lg hover:bg-green-600"
            title="استعادة موضع التمرير في الطلبات"
          >
            🔄
          </button>
        )}
        
        {couriersCardScroll.hasSavedPosition() && (
          <button
            onClick={couriersCardScroll.restoreScroll}
            className="bg-purple-500 text-white p-2 rounded-full shadow-lg hover:bg-purple-600"
            title="استعادة موضع التمرير في المندوبين"
          >
            🔄
          </button>
        )}
      </div>
    </div>
  );
};

export default Summary;
```

---

## 🧪 Testing

1. **Open your dashboard**
2. **Scroll down inside any card** (e.g., "إجمالي الطلبات")
3. **Navigate to another website** (e.g., google.com)
4. **Return to your dashboard**
5. **Open the same card** - scroll position should be restored! ✅

---

## 🎯 What This Achieves

- ✅ **Card scroll positions preserved** when navigating away
- ✅ **Automatic restoration** when returning
- ✅ **Visual indicators** showing when scroll position is available
- ✅ **Manual control** over scroll restoration
- ✅ **Professional user experience** with no lost scroll positions

---

## 🚨 Important Notes

- **Ensure containers have `overflow-y-auto`** CSS class
- **Set appropriate `max-h-*`** for scrollable areas
- **Use unique keys** for each scrollable container
- **Test with different content lengths** to ensure proper scrolling

This solution will fix your modal card scroll issue completely! 🚀

