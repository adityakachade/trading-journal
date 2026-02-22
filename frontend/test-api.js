const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testAPI() {
  try {
    console.log('🔐 Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const { accessToken, refreshToken } = loginResponse.data.data;
    console.log('✅ Login successful');
    
    console.log('📊 Testing trade creation...');
    const tradeResponse = await axios.post(`${API_BASE}/trades`, {
      symbol: 'EURUSD',
      direction: 'LONG',
      entryPrice: 1.0842,
      exitPrice: 1.0891,
      positionSize: 1,
      strategy: 'Breakout',
      session: 'London',
      emotionBefore: 'Confident',
      emotionAfter: 'Satisfied',
      notes: 'Test trade',
      tradeDate: new Date('2026-02-22')
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Trade created:', tradeResponse.data);
    
    console.log('📋 Testing trade retrieval...');
    const tradesResponse = await axios.get(`${API_BASE}/trades`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('✅ Trades retrieved:', tradesResponse.data);
    
  } catch (error) {
    console.error('❌ API Test failed:', error.response?.data || error.message);
  }
}

testAPI();
