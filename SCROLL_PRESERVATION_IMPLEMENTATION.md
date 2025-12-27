# Scroll Preservation Implementation for Dashboard Modals

## Problem Description
When users open a card/modal in the dashboard, scroll to a specific position, then navigate to another website and return, the scroll position inside the card resets to the beginning instead of maintaining the previous scroll position.

## Solution Overview
Implemented a comprehensive scroll preservation system using the `useModalScrollPreserve` hook that automatically saves and restores scroll positions for modal content areas.

## Implementation Details

### 1. Core Hook: `useModalScrollPreserve`

The hook provides automatic scroll position preservation with the following features:

- **Automatic Save**: Saves scroll position on every scroll event
- **Automatic Restore**: Restores scroll position when modal reopens
- **Cross-Session Persistence**: Uses both localStorage and sessionStorage
- **Page Visibility Handling**: Saves position when user switches tabs
- **Page Unload Handling**: Saves position before page navigation

### 2. Components Updated

#### A. Dashboard Summary Component (`src/components/Dashboard/Summary.tsx`)

**Added:**
```typescript
import { useModalScrollPreserve } from "../../lib/useModalScrollPreserve"

// Scroll preservation hook for modals
const ordersModalScroll = useModalScrollPreserve('summary-orders-modal', {
  persistToLocalStorage: true,
  restoreDelay: 150,
  saveOnScroll: true,
  autoRestore: true
})
```

**Applied to:**
- First orders modal (desktop version)
- Second orders modal (mobile/courier version)

**Scrollable Content Areas:**
```tsx
<div 
  ref={ordersModalScroll.containerRef}
  className="flex-1 overflow-y-auto p-6"
>
  {/* Modal content */}
</div>
```

**Close Button Updates:**
```tsx
onClick={() => {
  // Save scroll position before closing
  ordersModalScroll.restoreScroll()
  setSelectedOrders([])
}}
```

**Cleanup Effects:**
```tsx
// Cleanup effect for scroll preservation
useEffect(() => {
  return () => {
    if (ordersModalScroll.hasSavedPosition()) {
      ordersModalScroll.restoreScroll()
    }
  }
}, [ordersModalScroll])

// Save scroll position when page visibility changes
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden && selectedOrders.length > 0) {
      ordersModalScroll.restoreScroll()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [ordersModalScroll, selectedOrders.length])
```

#### B. Courier Orders List Component (`src/components/Courier/OrdersList.tsx`)

**Added:**
```typescript
import { useModalScrollPreserve } from "../../lib/useModalScrollPreserve"

// Scroll preservation hook for modal
const modalScroll = useModalScrollPreserve('orders-list-modal', {
  persistToLocalStorage: true,
  restoreDelay: 150,
  saveOnScroll: true,
  autoRestore: true
})
```

**Applied to:**
- Order update modal

**Scrollable Content Areas:**
```tsx
<div 
  ref={modalScroll.containerRef}
  className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
>
  {/* Modal content */}
</div>
```

**Close Button Updates:**
```tsx
onClick={() => {
  // Save scroll position before closing
  modalScroll.restoreScroll()
  setModalOpen(false)
}}
```

**Cleanup Effects:**
```tsx
// Cleanup effect for scroll preservation
useEffect(() => {
  return () => {
    if (modalScroll.hasSavedPosition()) {
      modalScroll.restoreScroll()
    }
  }
}, [modalScroll])

// Save scroll position when page visibility changes
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden && modalOpen) {
      modalScroll.restoreScroll()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [modalScroll, modalOpen])
```

### 3. How It Works

#### A. Scroll Position Saving
1. **On Scroll**: Position is automatically saved to both sessionStorage and localStorage
2. **On Tab Switch**: Position is saved when `document.hidden` becomes true
3. **On Page Unload**: Position is saved before navigation
4. **On Modal Close**: Position is saved when user closes the modal

#### B. Scroll Position Restoration
1. **On Modal Open**: Position is automatically restored from storage
2. **On Component Mount**: Position is restored if available
3. **Cross-Session**: Position persists even after browser restart

#### C. Storage Strategy
- **sessionStorage**: For same-session persistence (faster access)
- **localStorage**: For cross-session persistence (longer-term storage)
- **Fallback**: Uses sessionStorage first, then localStorage if needed

### 4. Configuration Options

The hook accepts the following configuration:

```typescript
{
  persistToLocalStorage: true,  // Save to localStorage for cross-session
  restoreDelay: 150,           // Delay before restoring (ms)
  saveOnScroll: true,          // Auto-save on scroll events
  autoRestore: true            // Auto-restore on mount
}
```

### 5. Testing

Created `test-scroll-preservation.html` to demonstrate the functionality:

1. Open the test modal
2. Scroll to any position
3. Navigate to another website/tab
4. Return to the page
5. Modal should maintain scroll position

### 6. Benefits

- **Improved UX**: Users don't lose their place in long lists
- **Cross-Navigation**: Works when switching between tabs/sites
- **Session Persistence**: Maintains position across browser sessions
- **Automatic**: No manual intervention required
- **Performance**: Minimal overhead with efficient storage

### 7. Browser Compatibility

- **Modern Browsers**: Full support for all features
- **Storage APIs**: Uses standard localStorage/sessionStorage
- **Event Handling**: Uses standard visibilitychange and beforeunload events
- **Fallbacks**: Graceful degradation if storage is unavailable

### 8. Future Enhancements

Potential improvements that could be added:

- **Scroll Position Animation**: Smooth scrolling to restored position
- **Multiple Modal Support**: Handle multiple open modals simultaneously
- **Scroll History**: Remember multiple scroll positions per modal
- **Custom Storage**: Allow custom storage backends
- **Performance Metrics**: Track scroll restoration success rates

## Usage Example

To add scroll preservation to a new modal:

```typescript
import { useModalScrollPreserve } from "../../lib/useModalScrollPreserve"

const MyComponent = () => {
  const modalScroll = useModalScrollPreserve('my-modal-key', {
    persistToLocalStorage: true,
    restoreDelay: 150,
    saveOnScroll: true,
    autoRestore: true
  })

  return (
    <div ref={modalScroll.containerRef} className="overflow-y-auto">
      {/* Scrollable content */}
    </div>
  )
}
```

## Conclusion

The scroll preservation implementation provides a seamless user experience by maintaining scroll positions across navigation events. The solution is robust, performant, and automatically handles edge cases like tab switching and page navigation.
