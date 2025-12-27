import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

class FormspreeSync {
  constructor() {
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Formspree configuration
    this.formId = 'xzzvydeg'; // Your form ID
    this.formspreeUrl = `https://formspree.io/api/forms/${this.formId}/submissions`;
    this.accessToken = process.env.FORMSPREE_ACCESS_TOKEN;
    
    // Sync configuration
    this.syncInterval = 2 * 60 * 1000; // 2 minutes
    this.lastSyncTime = null;
    this.isRunning = false;
    
    // Track processed submissions to avoid duplicates
    this.processedSubmissions = new Set();
  }

  // Start the sync process
  async start() {
    if (this.isRunning) {
      console.log('Formspree sync is already running');
      return;
    }

    console.log('🚀 Starting Formspree sync service...');
    console.log(`📝 Form ID: ${this.formId}`);
    console.log(`⏱️  Sync interval: ${this.syncInterval / 1000} seconds`);
    
    this.isRunning = true;
    
    // Initial sync
    await this.syncSubmissions();
    
    // Set up periodic sync
    this.syncTimer = setInterval(async () => {
      await this.syncSubmissions();
    }, this.syncInterval);
  }

  // Stop the sync process
  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.isRunning = false;
    console.log('🛑 Formspree sync service stopped');
  }

  // Fetch submissions from Formspree
  async fetchFormspreeSubmissions() {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const response = await fetch(this.formspreeUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`Formspree API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.submissions || [];
    } catch (error) {
      console.error('❌ Error fetching Formspree submissions:', error.message);
      return [];
    }
  }

  // Check if submission already exists in database
  async submissionExists(email, comment, createdTime) {
    try {
      const { data, error } = await this.supabase
        .from('requests')
        .select('id')
        .eq('email', email)
        .eq('comment', comment)
        .gte('created_at', new Date(createdTime - 60000).toISOString()) // Within 1 minute
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('❌ Error checking submission existence:', error.message);
      return false;
    }
  }

  // Process and save submission to database
  async processSubmission(submission) {
    try {
      const { name, email, phone, comment, image_url, video_url, created_at } = submission;
      
      // Validate required fields
      if (!name || !email || !phone || !comment) {
        console.log('⚠️ Skipping submission with missing fields:', { name, email, phone, comment });
        return false;
      }

      // Check if already processed
      const submissionKey = `${email}-${comment}-${created_at}`;
      if (this.processedSubmissions.has(submissionKey)) {
        return false;
      }

      // Check if exists in database
      const exists = await this.submissionExists(email, comment, new Date(created_at).getTime());
      if (exists) {
        console.log('⚠️ Submission already exists in database:', email);
        this.processedSubmissions.add(submissionKey);
        return false;
      }

      // Save to database
      const { data, error } = await this.supabase
        .from('requests')
        .insert([{
          name,
          email,
          phone,
          comment,
          image_url: image_url || null,
          video_url: video_url || null,
          status: 'pending',
          assignee: null,
          created_by: 'user:formspree',
          created_at: new Date(created_at).toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('❌ Error saving submission to database:', error.message);
        return false;
      }

      console.log('✅ New submission synced to database:', {
        id: data[0]?.id,
        email,
        name
      });

      // Mark as processed
      this.processedSubmissions.add(submissionKey);
      
      // Clean up old processed submissions (keep last 1000)
      if (this.processedSubmissions.size > 1000) {
        const submissionsArray = Array.from(this.processedSubmissions);
        this.processedSubmissions = new Set(submissionsArray.slice(-500));
      }

      return true;
    } catch (error) {
      console.error('❌ Error processing submission:', error.message);
      return false;
    }
  }

  // Main sync function
  async syncSubmissions() {
    try {
      console.log('🔄 Syncing Formspree submissions...');
      
      const submissions = await this.fetchFormspreeSubmissions();
      
      if (submissions.length === 0) {
        console.log('📭 No submissions found');
        return;
      }

      console.log(`📥 Found ${submissions.length} submissions`);
      
      let newSubmissions = 0;
      let skippedSubmissions = 0;

      // Process submissions in reverse order (newest first)
      for (const submission of submissions.reverse()) {
        const processed = await this.processSubmission(submission);
        if (processed) {
          newSubmissions++;
        } else {
          skippedSubmissions++;
        }
      }

      console.log(`✅ Sync completed: ${newSubmissions} new, ${skippedSubmissions} skipped`);
      this.lastSyncTime = new Date();

    } catch (error) {
      console.error('❌ Sync error:', error.message);
    }
  }

  // Get sync status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      syncInterval: this.syncInterval,
      processedCount: this.processedSubmissions.size,
      formId: this.formId
    };
  }

  // Manual sync trigger
  async manualSync() {
    console.log('🔄 Manual sync triggered');
    await this.syncSubmissions();
  }
}

// Export the class
export default FormspreeSync;
