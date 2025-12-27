import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Environment check:');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please create a .env file with your Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('requests')
      .select('count')
      .limit(1);
    
    if (error) {
      return res.status(500).json({ 
        status: 'ERROR', 
        message: 'Database connection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      status: 'OK', 
      message: '✅ Server and database working perfectly!',
      timestamp: new Date().toISOString(),
      database: 'Connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Form submission endpoint - DIRECT TO DATABASE
app.post('/api/submit-request', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, email, phone, comment } = req.body;
    const imageFile = req.files?.image?.[0];
    const videoFile = req.files?.video?.[0];

    // Validate required fields
    if (!name || !email || !phone || !comment) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields. Please fill in all required fields.' 
      });
    }

    let imageUrl = null;
    let videoUrl = null;

    // Handle image upload if present
    if (imageFile) {
      imageUrl = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
    }

    // Handle video upload if present
    if (videoFile) {
      videoUrl = `data:${videoFile.mimetype};base64,${videoFile.buffer.toString('base64')}`;
    }

    // Parse order IDs if present
    let orderIds = null;
    if (req.body.orderIds) {
      try {
        orderIds = JSON.parse(req.body.orderIds);
      } catch (e) {
        console.log('Warning: Could not parse order IDs:', req.body.orderIds);
      }
    }
    
    // Insert directly into database
    const { data, error } = await supabase
      .from('requests')
      .insert([{
        name,
        email,
        phone,
        comment,
        image_url: imageUrl,
        video_url: videoUrl,
        order_ids: orderIds ? JSON.stringify(orderIds) : null,
        status: 'pending',
        assignee: null,
        created_by: 'user:direct',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to save to database. Please try again.' 
      });
    }

    console.log('✅ New request saved to database:', {
      id: data[0]?.id,
      email,
      name,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      success: true, 
      message: '🎉 Request submitted successfully!',
      request_id: data[0]?.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Form submission error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error. Please try again.' 
    });
  }
});

// Get all requests for admin dashboard
app.get('/api/requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    res.json({
      success: true,
      count: data?.length || 0,
      requests: data || []
    });
  } catch (error) {
    console.error('❌ Error fetching requests:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch requests' 
    });
  }
});

// Update request status (for admin)
app.put('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('requests')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Request updated successfully',
      request: data[0]
    });
  } catch (error) {
    console.error('❌ Error updating request:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update request' 
    });
  }
});

// Add note to request (for admin)
app.post('/api/requests/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { note, author } = req.body;

    if (!note || !author) {
      return res.status(400).json({ 
        success: false,
        error: 'Note and author are required' 
      });
    }

    const { data, error } = await supabase
      .from('request_notes')
      .insert([{
        request_id: id,
        note,
        author,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Note added successfully',
      note: data[0]
    });
  } catch (error) {
    console.error('❌ Error adding note:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add note' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log('🚀 SIMPLE SERVER STARTED SUCCESSFULLY!');
  console.log('🚀 ========================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Form submission: http://localhost:${PORT}/api/submit-request`);
  console.log(`📊 Admin dashboard: http://localhost:${PORT}/api/requests`);
  console.log('\n📋 Available endpoints:');
  console.log(`  GET  /health - Server health check`);
  console.log(`  POST /api/submit-request - Submit form (DIRECT TO DATABASE)`);
  console.log(`  GET  /api/requests - Get all requests (Admin)`);
  console.log(`  PUT  /api/requests/:id - Update request status (Admin)`);
  console.log(`  POST /api/requests/:id/notes - Add note to request (Admin)`);
  console.log('\n✅ No Formspree needed - everything goes directly to your database!');
  console.log('✅ Form submissions appear immediately in your admin dashboard!');
  console.log('========================================\n');
});
