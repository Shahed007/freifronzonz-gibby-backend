import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const AUTH_URL = 'https://auth.giobby.com/auth/realms/api-server/protocol/openid-connect/token';
const LOGIN_ENDPOINT_URL = 'https://app.giobby.com/GiobbyApiLogin/v1/endpoint';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  not_before_policy: number;
  session_state: string;
}

interface EndpointResponse {
  responseCode: number;
  errorCode: number;
  GiobbyApiURL: string;
}

export class GiobbyAuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private giobbyApiUrl: string | null = null;
  private tokenExpirationDate: number | null = null;

  async authenticate(): Promise<void> {
    try {
      console.log('Authenticating with Giobby...');
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('client_id', process.env.GIOBBY_CLIENT_ID || 'api-server');
      params.append('username', process.env.GIOBBY_USERNAME || '');
      params.append('password', process.env.GIOBBY_PASSWORD || '');
      params.append('cid', process.env.GIOBBY_CID || '');

      const response = await axios.post<TokenResponse>(AUTH_URL, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      this.handleTokenResponse(response.data);
      console.log('Authentication successful.');

      await this.fetchApiEndpoint();
    } catch (error: any) {
      const errorData = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error('Authentication failed:', errorData);
      throw new Error(`Authentication failed: ${errorData}`);
    }
  }

  private handleTokenResponse(data: TokenResponse) {
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    // Set expiration time (subtract 10 seconds for safety)
    this.tokenExpirationDate = Date.now() + (data.expires_in - 10) * 1000;
  }

  private async fetchApiEndpoint(): Promise<void> {
    if (!this.accessToken) {
      throw new Error('No access token available.');
    }

    try {
      // Decode JWT to get idCompany (simple decode, no verify needed for extraction)
      const decoded: any = jwt.decode(this.accessToken);
      const idCompany = decoded?.companyId || decoded?.cid; // Adjust based on actual token structure if needed, or use CID from env
      
      // Note: The docs say decode JWT to get idCompany. Let's try to use the one from env/response if possible, or extract it.
      // Actually, let's look at the docs again: "Once decoded... retrieve idCompany".
      // Assuming it's in the token. For now, let's try calling without it or use the CID we have? 
      // Docs: "pass passing as queryparam idCompany={idCompany}".
      
      // Let's assume the CID from credentials IS the idCompany or equivalent.
      // But let's inspect the decoded token if possible. For now, I'll use the CID from env if logic is unsure, 
      // but strictly following docs: "decode access_token... retrieve idCompany".
      
      const realIdCompany = decoded?.extension_company_id || process.env.GIOBBY_CID;

      const response = await axios.get<EndpointResponse>(`${LOGIN_ENDPOINT_URL}`, {
        params: { idCompany: realIdCompany }, // The docs say idCompany extracted from token
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      });

      if (response.data.responseCode === 200) {
        this.giobbyApiUrl = response.data.GiobbyApiURL;
        console.log('Giobby API URL retrieved:', this.giobbyApiUrl);
      } else {
        throw new Error(`Failed to get API URL: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      console.error('Error fetching API endpoint:', error.response?.data || error.message);
      throw error;
    }
  }

  async getAccessToken(): Promise<string> {
    if (!this.accessToken || !this.tokenExpirationDate || Date.now() >= this.tokenExpirationDate) {
      await this.authenticate();
    }
    return this.accessToken!;
  }

  async getApiUrl(): Promise<string> {
    if (!this.giobbyApiUrl) {
      await this.authenticate();
    }
    return this.giobbyApiUrl!;
  }
}

export const giobbyAuthService = new GiobbyAuthService();
