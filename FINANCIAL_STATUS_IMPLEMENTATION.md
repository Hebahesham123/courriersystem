# Financial Status Implementation

This document describes the implementation of the Financial Status feature for the orders management system.

## Overview

The Financial Status feature adds a new column to track the financial state of orders beyond just payment status. This provides more granular financial tracking and better reporting capabilities.

## New Field: `financial_status`

### Possible Values
- `paid` - مدفوع بالكامل (Fully Paid)
- `partial` - مدفوع جزئياً (Partially Paid)
- `pending` - معلق (Pending)
- `overdue` - متأخر (Overdue)
- `refunded` - مسترد (Refunded)
- `disputed` - متنازع عليه (Disputed)

## Implementation Details

### 1. Database Changes
Run the SQL script `add_financial_status_column.sql` in your Supabase SQL editor to:
- Add the `financial_status` column to the orders table
- Add validation constraints
- Create performance indexes
- Set default values for existing orders

### 2. Frontend Changes

#### OrdersManagement Component
- Added Financial Status column to the orders table
- Added editing capability for financial status
- Added `getFinancialStatusBadge()` function for visual display

#### UploadOrders Component
- Updated Excel parsing to extract financial status from columns:
  - "Financial Status"
  - "FinancialStatus" 
  - "Payment Status"
  - "PaymentStatus"
- Added financial status normalization function
- Added financial status column to preview table

#### OrdersList Component (Courier View)
- Updated Order interface to include financial_status field

### 3. Excel Upload Support

When uploading Excel files, the system now looks for financial status information in these columns:
- **Primary**: "Financial Status" or "FinancialStatus"
- **Fallback**: "Payment Status" or "PaymentStatus"

The system automatically normalizes common financial status values:
- "paid", "completed", "success", "successful", "fulfilled" → `paid`
- "partial", "partially", "incomplete" → `partial`
- "pending", "processing", "awaiting", "authorized" → `pending`
- "overdue", "late", "delayed", "past due" → `overdue`
- "refunded", "refund", "returned", "cancelled" → `refunded`
- "disputed", "dispute", "chargeback", "fraud" → `disputed`

## Usage

### For Admins
1. **View Financial Status**: The financial status column appears in the orders management table
2. **Edit Financial Status**: Click the edit button on any order to modify the financial status
3. **Upload Orders**: Excel files with financial status columns will automatically populate this field

### For Couriers
- Financial status is visible in the orders list (read-only)

### For Excel Uploads
Include a "Financial Status" column in your Excel file with any of the supported values. The system will automatically normalize and store the appropriate status.

## Benefits

1. **Better Financial Tracking**: Separate from payment method, focuses on actual financial state
2. **Improved Reporting**: Can filter and report on orders by financial status
3. **Enhanced Workflow**: Better visibility into which orders need financial attention
4. **Audit Trail**: Clear tracking of financial state changes over time

## Migration Notes

- Existing orders will automatically get a default financial status based on their current payment_status
- The field is optional, so existing functionality remains unchanged
- New orders uploaded via Excel will include financial status if provided

## Future Enhancements

Potential future improvements could include:
- Financial status change history
- Automated financial status updates based on payment events
- Financial status-based notifications
- Integration with accounting systems
