import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import FormspreeSync from './formspree-sync.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Formspree sync service
let formspreeSync = null;
try {
  formspreeSync = new FormspreeSync();
  console.log('✅ Formspree sync service initialized');
} catch (error) {
  console.warn('⚠️ Formspree sync service not available:', error.message);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    formspreeSync: formspreeSync ? formspreeSync.getStatus() : null
  });
});

// Direct form submission endpoint
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
      return res.status(400).json({ error: 'Missing required fields' });
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

    // Insert into database
    const { data, error } = await supabase
      .from('requests')
      .insert([{
        name,
        email,
        phone,
        comment,
        image_url: imageUrl,
        video_url: videoUrl,
        status: 'pending',
        assignee: null,
        created_by: 'user:direct',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to save to database' });
    }

    res.json({ 
      success: true, 
      message: 'Request submitted successfully',
      request_id: data[0]?.id 
    });

  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all requests (for admin use)
app.get('/api/requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Update request status
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
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// Add note to request
app.post('/api/requests/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { note, author } = req.body;

    if (!note || !author) {
      return res.status(400).json({ error: 'Note and author are required' });
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
    res.json(data[0]);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Formspree sync control endpoints
app.get('/api/formspree/status', (req, res) => {
  if (!formspreeSync) {
    return res.status(503).json({ error: 'Formspree sync service not available' });
  }
  res.json(formspreeSync.getStatus());
});

app.post('/api/formspree/sync', async (req, res) => {
  if (!formspreeSync) {
    return res.status(503).json({ error: 'Formspree sync service not available' });
  }
  
  try {
    await formspreeSync.manualSync();
    res.json({ success: true, message: 'Manual sync completed' });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ error: 'Manual sync failed' });
  }
});

app.post('/api/formspree/start', (req, res) => {
  if (!formspreeSync) {
    return res.status(503).json({ error: 'Formspree sync service not available' });
  }
  
  try {
    formspreeSync.start();
    res.json({ success: true, message: 'Formspree sync service started' });
  } catch (error) {
    console.error('Start sync error:', error);
    res.status(500).json({ error: 'Failed to start sync service' });
  }
});

app.post('/api/formspree/stop', (req, res) => {
  if (!formspreeSync) {
    return res.status(503).json({ error: 'Formspree sync service not available' });
  }
  
  try {
    formspreeSync.stop();
    res.json({ success: true, message: 'Formspree sync service stopped' });
  } catch (error) {
    console.error('Stop sync error:', error);
    res.status(500).json({ error: 'Failed to stop sync service' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Form submission: http://localhost:${PORT}/api/submit-request`);
  
  // Start Formspree sync service if available
  if (formspreeSync) {
    console.log('🚀 Starting Formspree sync service...');
    formspreeSync.start().catch(error => {
      console.error('❌ Failed to start Formspree sync:', error.message);
    });
  }
  
  console.log('\n📋 Available endpoints:');
  console.log(`  GET  /health - Server health check`);
  console.log(`  POST /api/submit-request - Direct form submission`);
  console.log(`  GET  /api/requests - Get all requests`);
  console.log(`  PUT  /api/requests/:id - Update request`);
  console.log(`  POST /api/requests/:id/notes - Add note to request`);
  console.log(`  GET  /api/formspree/status - Formspree sync status`);
  console.log(`  POST /api/formspree/sync - Manual sync`);
  console.log(`  POST /api/formspree/start - Start sync service`);
  console.log(`  POST /api/formspree/stop - Stop sync service`);
});
