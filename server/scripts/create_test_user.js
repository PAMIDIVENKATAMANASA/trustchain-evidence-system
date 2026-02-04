/**
 * Create Test User Script
 * 
 * Usage: node scripts/create_test_user.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trustchain';

async function createTestUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test users to create
    const testUsers = [
      {
        name: 'Test Officer',
        email: 'officer@test.com',
        password: 'password123',
        role: 'officer',
        walletAddress: ''
      },
      {
        name: 'Test Judge',
        email: 'judge@test.com',
        password: 'password123',
        role: 'judge',
        walletAddress: ''
      },
      {
        name: 'Test Lawyer',
        email: 'lawyer@test.com',
        password: 'password123',
        role: 'lawyer',
        walletAddress: ''
      }
    ];

    console.log('📝 Creating test users...\n');

    for (const userData of testUsers) {
      // Check if user exists
      const existing = await User.findOne({ email: userData.email });
      
      if (existing) {
        console.log(`⚠️  User already exists: ${userData.email}`);
        console.log(`   Skipping...\n`);
        continue;
      }

      // Create user
      const user = new User(userData);
      await user.save();
      
      console.log(`✅ Created user: ${userData.email}`);
      console.log(`   Name: ${userData.name}`);
      console.log(`   Role: ${userData.role}`);
      console.log(`   Password: ${userData.password}\n`);
    }

    console.log('✅ Test users created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Officer: officer@test.com / password123');
    console.log('   Judge: judge@test.com / password123');
    console.log('   Lawyer: lawyer@test.com / password123');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

createTestUser();

