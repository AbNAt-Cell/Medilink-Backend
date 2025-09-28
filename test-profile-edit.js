import fetch from 'node-fetch';

// Test profile editing functionality
async function testProfileEdit() {
  const baseURL = 'http://localhost:8080';
  
  // First, login to get a token (you'll need valid credentials)
  const loginData = {
    email: 'test@example.com', // Replace with valid test user
    password: 'testpassword'   // Replace with valid password
  };

  try {
    // Login
    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed - need valid test credentials');
      console.log('Status:', loginResponse.status);
      const errorText = await loginResponse.text();
      console.log('Error:', errorText);
      return;
    }

    const loginResult = await loginResponse.json();
    const token = loginResult.token;
    console.log('✅ Login successful');

    // Test profile update with valid data
    const profileUpdateData = {
      firstname: 'Updated First Name',
      lastname: 'Updated Last Name',
      phone: '+1234567890',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        region: 'Test Region',
        postalCode: '12345',
        country: 'Test Country'
      }
    };

    const updateResponse = await fetch(`${baseURL}/api/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileUpdateData)
    });

    const updateResult = await updateResponse.json();
    
    if (!updateResponse.ok) {
      console.log('❌ Profile update failed');
      console.log('Status:', updateResponse.status);
      console.log('Error:', updateResult);
      return;
    }

    console.log('✅ Profile update successful');
    console.log('Updated fields:', updateResult.updatedFields);
    console.log('Updated user data:', JSON.stringify(updateResult.user, null, 2));

    // Test with invalid address (string instead of object)
    console.log('\n--- Testing invalid address format ---');
    const invalidUpdateData = {
      firstname: 'Another Update',
      address: 'ss' // This should be handled gracefully
    };

    const invalidUpdateResponse = await fetch(`${baseURL}/api/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(invalidUpdateData)
    });

    const invalidUpdateResult = await invalidUpdateResponse.json();
    
    if (invalidUpdateResponse.ok) {
      console.log('✅ Invalid address handled gracefully');
      console.log('Updated fields:', invalidUpdateResult.updatedFields);
      console.log('Address was skipped, other fields updated');
    } else {
      console.log('❌ Invalid address not handled properly');
      console.log('Error:', invalidUpdateResult);
    }

    // Verify data persists by fetching profile
    console.log('\n--- Verifying data persistence ---');
    const profileResponse = await fetch(`${baseURL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('✅ Profile fetched successfully');
      console.log('Current profile data:', JSON.stringify(profileData.user, null, 2));
    } else {
      console.log('❌ Failed to fetch profile');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testProfileEdit();