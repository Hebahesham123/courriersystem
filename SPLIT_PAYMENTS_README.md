# Split Payment Functionality

This feature allows couriers to split an order's total amount across multiple payment methods. For example, a courier can collect 1000 EGP in cash and 2000 EGP via Instapay for a 3000 EGP order.

## 🚀 Setup Instructions

### 1. Run the Database Schema
Execute the SQL commands in `split_payments_schema.sql` in your Supabase SQL editor:

```sql
-- This will:
-- 1. Add 'split' to payment_method options
-- 2. Create split_payments table
-- 3. Set up RLS policies
-- 4. Create validation triggers
```

### 2. Database Changes
- **Orders table**: Now accepts `payment_method = 'split'`
- **New table**: `split_payments` stores individual payment splits
- **Validation**: Ensures split payments don't exceed order total

## 💰 How Split Payments Work

### For Couriers:
1. **Select "Split"** as payment method for an order
2. **Add multiple payment methods** (cash, card, valu, etc.)
3. **Set amounts** for each payment method
4. **Total must equal** the order amount
5. **Save** the split payment configuration

### Example:
```
Order Total: 3000 EGP
├── Cash: 1000 EGP
├── Instapay: 1500 EGP
└── Valu: 500 EGP
Total: 3000 EGP ✅
```

## 📊 Dashboard Impact

### Before Split Payments:
- Order shows as single payment method
- Amount counted only in that method's total

### After Split Payments:
- Order shows as "Split" payment method
- **Amounts distributed correctly**:
  - 1000 EGP appears in "Cash" total
  - 1500 EGP appears in "Instapay" total  
  - 500 EGP appears in "Valu" total
- **No double counting** - each amount goes to the right place

## 🔧 Technical Implementation

### Database Structure:
```sql
-- Orders table
payment_method: 'split' (new option)

-- Split payments table
split_payments:
  - order_id (references orders.id)
  - payment_method (cash, card, valu, etc.)
  - amount (decimal)
  - created_by (user ID)
  - notes (optional)
  - created_at (timestamp)
```

### Validation Rules:
- ✅ Split payment total must equal order total
- ✅ Each split must have a valid payment method
- ✅ Each split must have a positive amount
- ✅ Cannot exceed order total

### RLS Policies:
- Users can read/write their own split payments
- Admins can manage all split payments
- Couriers can manage split payments for their orders

## 🎯 Usage Examples

### Scenario 1: Mixed Payment Collection
```
Customer wants to pay:
- 2000 EGP in cash
- 1000 EGP via card
- 500 EGP via valu

Courier sets up:
- Payment 1: Cash, 2000 EGP
- Payment 2: Card, 1000 EGP  
- Payment 3: Valu, 500 EGP
Total: 3500 EGP ✅
```

### Scenario 2: Partial Payment Split
```
Order total: 5000 EGP
Customer pays:
- 3000 EGP in cash
- 2000 EGP via paymob

Courier sets up:
- Payment 1: Cash, 3000 EGP
- Payment 2: Paymob, 2000 EGP
Total: 5000 EGP ✅
```

## 📱 UI Components

### SplitPaymentModal:
- **Payment method selection** for each split
- **Amount input** for each split
- **Add/remove** payment methods
- **Real-time validation** and totals
- **Notes field** for each split

### Dashboard Integration:
- **Payment method totals** include split amounts
- **Split orders** shown with proper breakdown
- **Financial summaries** accurate for all methods

## 🚨 Important Notes

### For Couriers:
- **Cannot exceed order total** - validation prevents this
- **Must complete all splits** before saving
- **Can edit existing splits** if needed
- **Notes are optional** but recommended

### For Admins:
- **Split payments visible** in all reports
- **Amounts distributed correctly** in summaries
- **No manual intervention** needed
- **Full audit trail** maintained

### For Developers:
- **API endpoints** handle split payment CRUD
- **Real-time updates** via Supabase subscriptions
- **Error handling** for validation failures
- **TypeScript interfaces** for type safety

## 🔍 Troubleshooting

### Common Issues:
1. **"Split payment total exceeds order total"**
   - Check individual amounts
   - Ensure total equals order amount exactly

2. **"Payment method not found"**
   - Verify payment method exists in options
   - Check database constraints

3. **"Cannot save split payments"**
   - Ensure user has proper permissions
   - Check RLS policies are active

### Debug Steps:
1. Check browser console for errors
2. Verify database schema is updated
3. Confirm user authentication
4. Check RLS policies

## 📈 Future Enhancements

### Potential Features:
- **Bulk split payment** creation
- **Split payment templates** for common scenarios
- **Advanced validation** rules
- **Split payment analytics** and reporting
- **Mobile app integration**

## 🎉 Benefits

### For Business:
- **Accurate financial reporting** with proper payment distribution
- **Flexible payment collection** for customers
- **Better cash flow tracking** by payment method
- **Reduced manual reconciliation** work

### For Couriers:
- **Easy split payment setup** with intuitive UI
- **Real-time validation** prevents errors
- **Flexible payment collection** options
- **Clear payment breakdown** for customers

### For Customers:
- **Multiple payment options** for single order
- **Transparent payment breakdown** 
- **Convenient payment flexibility**
- **Clear payment receipts**

---

**Split payments are now fully integrated into your system!** 🚀

Couriers can split orders across multiple payment methods, and the dashboard will show each amount in the correct payment method total. No more missing or double-counted payments! 💰✨
