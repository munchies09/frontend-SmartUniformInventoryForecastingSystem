/**
 * Forecast Service - Frontend API client
 * 
 * Service for interacting with the Forecasting API endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ForecastParams {
  category: string;
  type: string;
  size?: string | null;
  forecastDate?: string | null;
  batch?: string;
}

export interface ForecastFilters {
  category?: string;
  type?: string;
  size?: string | null;
  forecastDate?: string | null;
}

export interface Forecast {
  category: string;
  type: string;
  size: string | null;
  forecastDate: string;
  predictedDemand: number;
  confidence?: number;
  modelInfo: {
    modelType: string;
    version: string;
    accuracy?: {
      mae?: number;
      rmse?: number;
      r2?: number;
      [key: string]: number | undefined;
    };
  };
}

export interface AllForecastItem extends Forecast {
  currentQuantity: number;
  status: string;
  reorderRecommendation: string;
}

export interface ForecastResponse {
  success: boolean;
  forecast?: Forecast;
  message?: string;
  error?: string;
}

export interface AllForecastsResponse {
  success: boolean;
  forecasts?: AllForecastItem[];
  modelInfo?: Forecast['modelInfo'];
  forecastDate?: string;
  count?: number;
  message?: string;
  error?: string;
}

export interface ModelInfo {
  success: boolean;
  model?: {
    modelName: string;
    modelType: string;
    version: string;
    features: string[];
    accuracy?: {
      mae?: number;
      rmse?: number;
      r2?: number;
      [key: string]: number | undefined;
    };
    trainingDate: string;
    description?: string;
    featureCount: number;
    hasCoefficients: boolean;
    hasScaler: boolean;
  };
  message?: string;
  error?: string;
}

export interface ModelUploadData {
  modelName: string;
  modelType: string;
  version: string;
  features: string[];
  coefficients?: number[];
  intercept?: number;
  modelParameters?: any;
  scalerParameters?: {
    mean?: number[];
    std?: number[];
    min?: number[];
    max?: number[];
    scalerType?: 'standard' | 'minmax';
  };
  accuracy?: {
    mae?: number;
    rmse?: number;
    r2?: number;
    [key: string]: number | undefined;
  };
  description?: string;
}

export interface ModelUploadResponse {
  success: boolean;
  message?: string;
  model?: {
    id: string;
    modelName: string;
    modelType: string;
    version: string;
    featureCount: number;
    trainingDate: string;
  };
  error?: string;
}

class ForecastService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Get forecast for a specific item
   */
  async getForecast(params: ForecastParams): Promise<ForecastResponse> {
    const queryParams = new URLSearchParams({
      category: params.category,
      type: params.type,
      ...(params.size && { size: params.size }),
      ...(params.forecastDate && { forecastDate: params.forecastDate }),
      ...(params.batch && { batch: params.batch })
    });

    const response = await fetch(
      `${API_BASE_URL}/api/forecast?${queryParams}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse<ForecastResponse>(response);
  }

  /**
   * Get forecasts for all inventory items
   */
  async getAllForecasts(filters: ForecastFilters = {}): Promise<AllForecastsResponse> {
    const queryParams = new URLSearchParams();
    
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.size !== undefined) {
      queryParams.append('size', filters.size === null ? 'null' : filters.size);
    }
    if (filters.forecastDate) queryParams.append('forecastDate', filters.forecastDate);

    const response = await fetch(
      `${API_BASE_URL}/api/forecast/all?${queryParams}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse<AllForecastsResponse>(response);
  }

  /**
   * Get current model information
   */
  async getModelInfo(): Promise<ModelInfo> {
    const response = await fetch(
      `${API_BASE_URL}/api/forecast/model`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse<ModelInfo>(response);
  }

  /**
   * Upload/update ML model (Admin only)
   */
  async uploadModel(modelData: ModelUploadData): Promise<ModelUploadResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/forecast/model`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(modelData)
      }
    );

    return this.handleResponse<ModelUploadResponse>(response);
  }

  /**
   * Get feature vector for debugging
   */
  async getFeatureVector(params: ForecastParams): Promise<any> {
    const queryParams = new URLSearchParams({
      category: params.category,
      type: params.type,
      ...(params.size && { size: params.size }),
      ...(params.forecastDate && { forecastDate: params.forecastDate }),
      ...(params.batch && { batch: params.batch })
    });

    const response = await fetch(
      `${API_BASE_URL}/api/forecast/features?${queryParams}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse<any>(response);
  }

  /**
   * Run forecast prediction (triggers backend to generate recommended stock)
   * This loads the pre-trained model, gets historical data, runs predictions, and saves to DB
   */
  async runForecast(): Promise<{ success: boolean; message?: string; error?: string; generated?: number }> {
    const response = await fetch(
      `${API_BASE_URL}/api/forecast/run`,
      {
        method: 'POST',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse<{ success: boolean; message?: string; error?: string; generated?: number }>(response);
  }
}

// Export singleton instance
export const forecastService = new ForecastService();
