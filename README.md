# CourierPro - Delivery Management System

A comprehensive courier management system built with React, TypeScript, and Supabase for managing Shopify orders and delivery operations.

## Features

### Admin Panel
- Upload Shopify orders via Excel files
- Assign orders to couriers
- Track order status and progress
- View comprehensive reports and summaries
- Manage couriers and assignments

### Courier Panel
- View assigned orders
- Update order status (delivered, canceled, partial)
- Add delivery fees and comments
- Real-time dashboard with daily summaries
- Mobile-friendly interface

### Key Features
- **Bilingual Support**: English and Arabic with RTL layout
- **Real-time Updates**: Live synchronization of order status
- **Professional UI**: Modern, clean design with smooth animations
- **Mobile Responsive**: Optimized for mobile couriers
- **Excel Integration**: Easy upload and parsing of Shopify orders
- **Role-based Access**: Separate interfaces for admin and couriers

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (Database + Authentication)
- **File Processing**: XLSX for Excel file parsing
- **Icons**: Lucide React
- **Routing**: React Router
- **Build Tool**: Vite

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ installed
- Supabase account

### 2. Database Setup
First, you need to set up your Supabase database:

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the following SQL to create the required tables:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'courier')),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  customer_name text NOT NULL,
  address text NOT NULL,
  mobile_number text NOT NULL,
  total_order_fees numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'valu', 'partial')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'delivered', 'canceled', 'partial')),
  assigned_courier_id uuid REFERENCES users(id),
  delivery_fee numeric DEFAULT 0,
  partial_paid_amount numeric DEFAULT 0,
  internal_comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Create policies for orders table
CREATE POLICY "Admin can do everything with orders" ON orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Couriers can read assigned orders" ON orders
  FOR SELECT TO authenticated
  USING (assigned_courier_id = auth.uid());

CREATE POLICY "Couriers can update assigned orders" ON orders
  FOR UPDATE TO authenticated
  USING (assigned_courier_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_assigned_courier_id ON orders(assigned_courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);
```

### 3. Authentication Setup
1. In your Supabase dashboard, go to Authentication > Settings
2. Disable "Enable email confirmations" for easier testing
3. Create test users manually in Authentication > Users:
   - Admin user: admin@example.com / password123
   - Courier user: courier@example.com / password123

4. After creating users in Supabase Auth, insert corresponding records in the users table:

```sql
-- Insert admin user (replace 'admin-user-id' with actual UUID from auth.users)
INSERT INTO users (id, email, role, name) 
VALUES ('admin-user-id', 'admin@example.com', 'admin', 'Admin User');

-- Insert courier user (replace 'courier-user-id' with actual UUID from auth.users)
INSERT INTO users (id, email, role, name) 
VALUES ('courier-user-id', 'courier@example.com', 'courier', 'Courier User');
```

### 4. Environment Configuration
1. Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

2. Fill in your Supabase credentials in `.env`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase dashboard under Settings > API.

### 5. Installation and Running
1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Usage

### Login Credentials
- **Admin**: admin@example.com / password123
- **Courier**: courier@example.com / password123

### Excel Upload Format
When uploading orders via Excel, ensure your file has these columns:
- Order ID
- Customer Name  
- Address
- Mobile Number
- Total Order Fees
- Payment Method (cash/card/valu/partial)

### Language Switching
Click the language toggle button in the header to switch between English and Arabic. The interface will automatically adjust to RTL layout for Arabic.

## Features Overview

### Admin Features
- **Dashboard**: Overview of all orders and courier performance
- **Upload Orders**: Bulk upload via Excel files
- **Order Management**: Assign orders to couriers, track status
- **Real-time Summaries**: Auto-updating statistics and reports

### Courier Features  
- **My Orders**: View all assigned orders
- **Quick Actions**: Mark orders as done/canceled with single click
- **Detailed Updates**: Add delivery fees, partial payments, comments
- **Real-time Dashboard**: Live updates of daily performance

## Production Deployment

### Build for Production
```bash
npm run build
```

### Local Development
This project is designed to run locally. To start development:

1. Install dependencies: `npm install`
2. Create `.env` file with your database credentials
3. Start development server: `npm run dev`
4. Start backend server: `npm run server`

## Support

For issues or questions, please check:
1. Supabase connection is working
2. Database tables are created correctly  
3. Environment variables are set properly
4. Users exist in both auth.users and public.users tables

## License

MIT License - feel free to use this project for your delivery management needs!