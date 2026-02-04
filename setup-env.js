/**
 * Environment Variables Setup Helper
 * 
 * This script helps you verify and set up your .env file
 * 
 * Usage: node setup-env.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log('🔍 Checking environment variables...\n');

// Required variables
const required = {
  'VITE_SUPABASE_URL': 'Supabase Project URL (from Supabase Dashboard > Settings > API)',
  'SUPABASE_SERVICE_ROLE_KEY': 'Supabase Service Role Key (from Supabase Dashboard > Settings > API)',
  'SHOPIFY_STORE_URL': 'Shopify Store URL (e.g., your-store.myshopify.com)',
  'SHOPIFY_ACCESS_TOKEN': 'Shopify Admin API Access Token'
};

// Optional variables
const optional = {
  'SUPABASE_URL': 'Alternative Supabase URL (uses VITE_SUPABASE_URL if not set)',
  'VITE_SUPABASE_ANON_KEY': 'Supabase Anon Key (for frontend)',
  'SUPABASE_ANON_KEY': 'Alternative Supabase Anon Key',
  'SHOPIFY_API_VERSION': 'Shopify API Version (defaults to 2024-10)'
};

let allRequiredSet = true;
let missingRequired = [];

console.log('📋 Required Variables:');
console.log('─'.repeat(60));
Object.entries(required).forEach(([key, description]) => {
  const value = process.env[key];
  if (value && value.trim() !== '') {
    const preview = value.length > 30 ? value.substring(0, 30) + '...' : value;
    console.log(`✅ ${key}: Set`);
    console.log(`   ${description}`);
    console.log(`   Value: ${preview}\n`);
  } else {
    console.log(`❌ ${key}: Missing`);
    console.log(`   ${description}\n`);
    allRequiredSet = false;
    missingRequired.push(key);
  }
});

console.log('\n📋 Optional Variables:');
console.log('─'.repeat(60));
Object.entries(optional).forEach(([key, description]) => {
  const value = process.env[key];
  if (value && value.trim() !== '') {
    console.log(`✅ ${key}: Set`);
  } else {
    console.log(`⚪ ${key}: Not set (optional)`);
  }
  console.log(`   ${description}\n`);
});

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

console.log('\n📁 File Status:');
console.log('─'.repeat(60));
if (envExists) {
  console.log(`✅ .env file exists at: ${envPath}`);
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    console.log(`   Contains ${lines.length} configuration lines`);
  } catch (error) {
    console.log(`   ⚠️  Could not read .env file: ${error.message}`);
  }
} else {
  console.log(`❌ .env file NOT found at: ${envPath}`);
  console.log(`   You need to create this file with your credentials.`);
}

// Summary
console.log('\n' + '='.repeat(60));
if (allRequiredSet) {
  console.log('✅ All required environment variables are set!');
  console.log('   You can now run: node FORCE_RESYNC_ALL_ORDERS.js');
  console.log('   Or: npm run shopify-sync');
} else {
  console.log('❌ Some required environment variables are missing.');
  console.log('\nMissing variables:');
  missingRequired.forEach(key => {
    console.log(`   - ${key}`);
  });
  console.log('\n📝 Next Steps:');
  console.log('   1. Create a .env file in the project root');
  console.log('   2. Add the missing variables (see QUICK_ENV_SETUP.md)');
  console.log('   3. Get credentials from:');
  console.log('      - Supabase: https://app.supabase.com → Settings → API');
  console.log('      - Shopify: Admin → Settings → Apps → Develop apps');
  console.log('   4. Run this script again to verify');
}
console.log('='.repeat(60) + '\n');

// Exit with error code if variables are missing
if (!allRequiredSet) {
  process.exit(1);
}

