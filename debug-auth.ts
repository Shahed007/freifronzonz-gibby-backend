import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const AUTH_URL = 'https://auth.giobby.com/auth/realms/api-server/protocol/openid-connect/token';

async function testAuth() {
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', process.env.GIOBBY_CLIENT_ID || '');
  params.append('username', process.env.GIOBBY_USERNAME || '');
  params.append('password', process.env.GIOBBY_PASSWORD || '');
  params.append('cid', process.env.GIOBBY_CID || '');

  console.log('Attempting authentication with:');
  console.log('CID:', process.env.GIOBBY_CID);
  console.log('Client ID:', process.env.GIOBBY_CLIENT_ID);
  console.log('Username:', process.env.GIOBBY_USERNAME);
  console.log('---');

  try {
    const response = await axios.post(AUTH_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log('✓ Authentication successful!');
    console.log('Access Token (first 50 chars):', response.data.access_token.substring(0, 50) + '...');
    console.log('Token expires in:', response.data.expires_in, 'seconds');
    console.log('---');

    // Decode the token to see what's inside
    const decoded: any = jwt.decode(response.data.access_token);
    console.log('Decoded JWT payload:', JSON.stringify(decoded, null, 2));
    console.log('---');

    // Now try to get the endpoint
    const idCompany = decoded?.extension_company_id || decoded?.companyId || decoded?.cid || process.env.GIOBBY_CID;
    console.log('Using idCompany:', idCompany);

    const endpointResponse = await axios.get('https://app.giobby.com/GiobbyApiLogin/v1/endpoint', {
      params: { idCompany },
      headers: {
        Authorization: `Bearer ${response.data.access_token}`
      }
    });

    console.log('✓ Endpoint retrieved!');
    console.log('API URL:', endpointResponse.data.GiobbyApiURL);

  } catch (error: any) {
    console.error('✗ Error:', error.response?.data || error.message);
  }
}

testAuth();
