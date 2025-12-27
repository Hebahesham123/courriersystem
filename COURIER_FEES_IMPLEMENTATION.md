# Courier Fees Implementation

This implementation allows administrators to set individual daily delivery fees for each courier instead of having a single fee that applies to all couriers.

## Features

- **Individual Fees**: Each courier can have their own daily delivery fee
- **Date-based Management**: Fees can be set for specific dates
- **Admin Control**: Only administrators can manage courier fees
- **Bilingual Support**: Full Arabic and English language support
- **Real-time Updates**: Immediate fee updates across the system

## Database Schema

### New Table: `courier_fees`

```sql
CREATE TABLE IF NOT EXISTS courier_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    courier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fee_amount numeric NOT NULL DEFAULT 0,
    fee_date date NOT NULL DEFAULT CURRENT_DATE,
    is_active boolean NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one active fee per courier per date
    UNIQUE(courier_id, fee_date, is_active)
);
```

### Key Features:
- **Unique Constraint**: Only one active fee per courier per date
- **Cascade Delete**: Fees are automatically removed when a courier is deleted
- **Audit Trail**: Tracks who created the fee and when
- **Active Status**: Allows deactivating fees without deletion

## Setup Instructions

### 1. Database Setup

Run the SQL schema in your Supabase SQL editor:

```bash
# Copy the contents of courier_fees_schema.sql and run it in Supabase
```

### 2. Component Integration

The new `CourierFeesManagement` component is automatically integrated into:
- **App.tsx**: New route `/admin/courier-fees`
- **Sidebar.tsx**: New menu item with DollarSign icon
- **LanguageContext.tsx**: New translations for both languages

### 3. Access

Navigate to: **Admin Panel → Courier Fees** (`/admin/courier-fees`)

## Usage

### Setting Daily Fees

1. **Add New Fee**:
   - Click "Add Fee" button
   - Select courier from dropdown
   - Enter fee amount (in Kuwaiti Dinar - د.ك)
   - Choose date (defaults to today)
   - Click "Add Fee"

2. **Edit Existing Fee**:
   - Click edit icon on any fee row
   - Modify amount or date
   - Click "Save Changes"

3. **Delete Fee**:
   - Click delete icon on any fee row
   - Confirm deletion

### Fee Management Features

- **Current Fees Overview**: Shows today's fees for all couriers
- **Fees History**: Complete history of all fee changes
- **Status Indicators**: Visual indicators for active/inactive fees
- **Quick Actions**: Direct edit/add buttons for each courier

## API Integration

### Fetching Courier Fees

```typescript
// Get all fees
const { data, error } = await supabase
  .from('courier_fees')
  .select('*')
  .order('fee_date', { ascending: false })

// Get fees for specific courier
const { data, error } = await supabase
  .from('courier_fees')
  .select('*')
  .eq('courier_id', courierId)
  .eq('is_active', true)

// Get today's fee for a courier
const today = new Date().toISOString().split('T')[0]
const { data, error } = await supabase
  .from('courier_fees')
  .select('*')
  .eq('courier_id', courierId)
  .eq('fee_date', today)
  .eq('is_active', true)
  .single()
```

### Creating/Updating Fees

```typescript
// Create new fee
const { error } = await supabase
  .from('courier_fees')
  .insert([{
    courier_id: courierId,
    fee_amount: 5.00,
    fee_date: '2025-01-26',
    created_by: adminUserId
  }])

// Update existing fee
const { error } = await supabase
  .from('courier_fees')
  .update({
    fee_amount: 6.00,
    updated_at: new Date().toISOString()
  })
  .eq('id', feeId)
```

## Security

### Row Level Security (RLS)

- **Admin Access**: Full CRUD operations on all fees
- **Courier Access**: Read-only access to their own fees
- **Authentication Required**: All operations require valid user session

### Policies

```sql
-- Admin can manage all courier fees
CREATE POLICY "Admin can manage courier fees" ON courier_fees
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Couriers can read their own fees
CREATE POLICY "Couriers can read own fees" ON courier_fees
    FOR SELECT TO authenticated
    USING (courier_id = auth.uid());
```

## Integration with Existing System

### Dashboard Integration

The courier fees can be integrated into the existing dashboard to show:
- Total fees collected per courier
- Fee-based calculations in financial reports
- Historical fee trends

### Order Management

Fees can be referenced when:
- Calculating delivery costs
- Generating financial reports
- Managing courier performance metrics

## Benefits

1. **Flexibility**: Different couriers can have different rates
2. **Fairness**: Rates can be adjusted based on experience, performance, or region
3. **Transparency**: Clear fee structure for each courier
4. **Scalability**: Easy to add new couriers with custom rates
5. **Audit Trail**: Complete history of fee changes

## Future Enhancements

- **Bulk Fee Updates**: Set fees for multiple couriers at once
- **Fee Templates**: Predefined fee structures for different courier types
- **Performance-based Fees**: Dynamic fees based on delivery performance
- **Regional Fees**: Different rates for different delivery areas
- **Fee Scheduling**: Set fees for future dates in advance

## Troubleshooting

### Common Issues

1. **Duplicate Fee Error**: Ensure only one active fee per courier per date
2. **Permission Denied**: Verify user has admin role
3. **Fee Not Showing**: Check if fee is marked as active and date matches

### Debug Queries

```sql
-- Check all fees for a specific courier
SELECT * FROM courier_fees WHERE courier_id = 'courier-uuid';

-- Check today's active fees
SELECT cf.*, u.name as courier_name 
FROM courier_fees cf 
JOIN users u ON cf.courier_id = u.id 
WHERE cf.fee_date = CURRENT_DATE AND cf.is_active = true;

-- Check fee history
SELECT cf.*, u.name as courier_name 
FROM courier_fees cf 
JOIN users u ON cf.courier_id = u.id 
ORDER BY cf.fee_date DESC, u.name;
```

## Support

For issues or questions about the courier fees implementation:
1. Check the database logs in Supabase
2. Verify RLS policies are correctly applied
3. Ensure user roles are properly set
4. Check browser console for JavaScript errors
