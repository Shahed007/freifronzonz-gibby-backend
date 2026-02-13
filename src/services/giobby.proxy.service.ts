import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { giobbyAuthService } from './giobby.auth.service';

export class GiobbyProxyService {
  
  async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const apiUrl = await giobbyAuthService.getApiUrl();
    const accessToken = await giobbyAuthService.getAccessToken();

    // Ensure the URL is complete
    const url = config.url?.startsWith('http') ? config.url : `${apiUrl}${config.url}`;

    const newConfig: AxiosRequestConfig = {
      ...config,
      url,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${accessToken}`,
        'X-Giobby-Realm': 'api-server',
        'Accept': 'application/json'
      }
    };

    try {
      return await axios(newConfig);
    } catch (error: any) {
      // If 401, maybe token expired? (Logic could be added here to force refresh)
      console.error('Proxy Request failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.request<T>({ ...config, method: 'GET', url });
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.request<T>({ ...config, method: 'POST', url, data });
    return response.data;
  }
}

export const giobbyProxyService = new GiobbyProxyService();
