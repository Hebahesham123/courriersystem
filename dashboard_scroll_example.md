# Dashboard Scroll Position Preservation

This document shows how to implement scroll position preservation in dashboard components so that when admins navigate away and return, their scroll position and filters are maintained.

## Quick Implementation

### 1. Import the hooks

```tsx
import { useScrollRestore } from "../../lib/useScrollRestore"
import { useDashboardFilters, useDashboardScroll } from "../../lib/useDashboardFilters"
```

### 2. Use in your component

```tsx
const Summary: React.FC = () => {
  // Preserve scroll position for the main dashboard
  const { scrollPosition, resetScroll } = useDashboardScroll('admin-summary');
  
  // Preserve filters and state
  const filters = useDashboardFilters('admin-summary-filters', {
    dateRange: { startDate: getTodayDateString(), endDate: getTodayDateString() },
    selectedCourier: null,
    showAnalytics: true,
    includeHoldFeesInPayment: false,
    holdDateFilter: 'all',
    customHoldDate: '',
  });

  // Preserve scroll for specific sections
  const summaryScrollRef = useRef<HTMLDivElement>(null);
  useScrollRestore(summaryScrollRef, 'admin-summary-content', {
    persistToLocalStorage: true, // Persist across browser sessions
    restoreDelay: 150, // Wait for content to load
  });

  // Use the preserved filters
  const [dateRange, setDateRange] = useState(filters.state.dateRange);
  const [selectedCourier, setSelectedCourier] = useState(filters.state.selectedCourier);
  const [showAnalytics, setShowAnalytics] = useState(filters.state.showAnalytics);
  const [includeHoldFeesInPayment, setIncludeHoldFeesInPayment] = useState(filters.state.includeHoldFeesInPayment);

  // Update filters when they change
  useEffect(() => {
    filters.updateFilters({
      dateRange,
      selectedCourier,
      showAnalytics,
      includeHoldFeesInPayment,
    });
  }, [dateRange, selectedCourier, showAnalytics, includeHoldFeesInPayment]);

  // Add reset button for testing
  const handleReset = () => {
    filters.resetFilters();
    resetScroll();
  };

  return (
    <div className="min-h-screen bg-gray-50" ref={summaryScrollRef}>
      {/* Your dashboard content */}
      
      {/* Reset button for testing */}
      <button 
        onClick={handleReset}
        className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg"
        title="Reset scroll and filters"
      >
        🔄
      </button>
    </div>
  );
};
```

## Features

### ✅ **Scroll Position Preservation**
- Saves scroll position on scroll
- Restores scroll position when returning
- Works across page reloads and navigation
- Persists in localStorage (optional)

### ✅ **Filter State Preservation**
- Saves all filter states
- Restores filters when returning
- Automatically expires old filters (7 days)
- Handles complex filter objects

### ✅ **Performance Optimized**
- Uses passive scroll listeners
- Debounced state saving
- Minimal impact on performance

### ✅ **Error Handling**
- Graceful fallback if storage fails
- Console warnings for debugging
- Continues working even with errors

## Usage Examples

### Basic Scroll Preservation
```tsx
const { scrollPosition, resetScroll } = useDashboardScroll('my-component');
```

### Advanced Scroll with Options
```tsx
const scrollRef = useRef<HTMLDivElement>(null);
const { scrollPosition, resetScroll } = useScrollRestore(scrollRef, 'my-scrollable-section', {
  persistToLocalStorage: true, // Save across browser sessions
  restoreDelay: 200, // Wait longer for content to load
  saveOnScroll: true, // Save on every scroll event
});
```

### Filter Preservation
```tsx
const filters = useDashboardFilters('my-filters', {
  searchTerm: '',
  status: 'all',
  dateRange: { start: '', end: '' },
  selectedItems: [],
});

// Use filters.state.searchTerm, filters.state.status, etc.
// Update with filters.updateFilter('searchTerm', 'new value')
// Reset with filters.resetFilters()
```

## Implementation Steps

1. **Add the hooks to your component**
2. **Wrap scrollable content with refs**
3. **Use the preserved state in your component**
4. **Update filters when they change**
5. **Test by navigating away and returning**

## Testing

1. **Scroll down in dashboard**
2. **Navigate to another website**
3. **Return to dashboard**
4. **Scroll position should be restored**
5. **Filters should be preserved**

## Troubleshooting

- **Scroll not restoring?** Check if the ref is properly attached
- **Filters not saving?** Ensure the key is unique for each component
- **Performance issues?** Check if saveOnScroll is enabled unnecessarily

## Browser Support

- ✅ Chrome/Edge (localStorage + sessionStorage)
- ✅ Firefox (localStorage + sessionStorage)
- ✅ Safari (localStorage + sessionStorage)
- ✅ Mobile browsers (localStorage + sessionStorage)

The solution automatically falls back gracefully if storage is not available.

