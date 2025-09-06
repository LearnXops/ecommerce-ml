const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAuthFlow() {
  console.log('🚀 Testing Authentication Service Flow...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log();

    // Test 2: Register User
    console.log('2. Testing user registration...');
    const registerData = {
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'John',
      lastName: 'Doe'
    };

    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, registerData);
      console.log('✅ Registration successful:', {
        user: registerResponse.data.data.user,
        hasToken: !!registerResponse.data.data.token
      });
      console.log();
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  User already exists, continuing with login test...');
      } else {
        throw error;
      }
    }

    // Test 3: Login User
    console.log('3. Testing user login...');
    const loginData = {
      email: 'test@example.com',
      password: 'TestPass123!'
    };

    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful:', {
      user: loginResponse.data.data.user,
      hasToken: !!token
    });
    console.log();

    // Test 4: Get Profile (Protected Route)
    console.log('4. Testing protected route - get profile...');
    const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Profile retrieval successful:', profileResponse.data.data.user);
    console.log();

    // Test 5: Update Profile (Protected Route)
    console.log('5. Testing protected route - update profile...');
    const updateData = {
      firstName: 'Jane',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'United States'
      }
    };

    const updateResponse = await axios.put(`${BASE_URL}/api/auth/profile`, updateData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Profile update successful:', updateResponse.data.data.user);
    console.log();

    // Test 6: Test Invalid Token
    console.log('6. Testing invalid token handling...');
    try {
      await axios.get(`${BASE_URL}/api/auth/profile`, {
        headers: {
          Authorization: 'Bearer invalid-token'
        }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Invalid token properly rejected');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All authentication tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const isServerRunning = await checkServer();
  
  if (!isServerRunning) {
    console.log('⚠️  Auth service is not running. Please start it first with:');
    console.log('   cd backend/auth-service && npm run dev');
    console.log('\nThen run this test again.');
    process.exit(1);
  }

  await testAuthFlow();
}

main();