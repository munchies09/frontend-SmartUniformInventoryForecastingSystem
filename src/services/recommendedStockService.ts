/**
 * Recommended Stock Service - Frontend API client
 * 
 * Service for interacting with the Recommended Stock API endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface RecommendedStockItem {
  category: string;
  type: string;
  size?: string | null;
  recommendedStock: number;
  currentStock?: number;
  forecastedDemand?: number;
  reorderQuantity?: number;
  notes?: string;
  analysisDate?: string;
  source?: string;
}

export interface ColabExportFormat {
  generatedAt: string;
  source: string;
  totalItems: number;
  recommendations: RecommendedStockItem[];
}

export interface ImportRecommendationsRequest {
  generatedAt?: string;
  source?: string;
  totalItems?: number;
  recommendations: RecommendedStockItem[];
  overwrite?: boolean;
}

export interface ImportRecommendationsResponse {
  success: boolean;
  message?: string;
  imported?: number;
  updatedInventoryItems?: number;
  totalItems?: number;
  generatedAt?: string;
  source?: string;
  recommendations?: RecommendedStockItem[];
  error?: string;
}

export interface GraphDataItem {
  size: string;
  recommendedStock: number;
  forecastedDemand?: number;
}

export interface GetGraphDataResponse {
  success: boolean;
  category?: string;
  type?: string;
  data?: GraphDataItem[];
  count?: number;
  message?: string;
  error?: string;
}

export interface GetRecommendationsFilters {
  category?: string;
  type?: string;
  size?: string | null;
  latest?: boolean;
}

export interface GetRecommendationsResponse {
  success: boolean;
  recommendations?: RecommendedStockItem[];
  count?: number;
  message?: string;
  error?: string;
}

export interface GetItemRecommendationParams {
  category: string;
  type: string;
  size?: string | null;
}

export interface GetItemRecommendationResponse {
  success: boolean;
  recommendation?: RecommendedStockItem;
  inventory?: {
    currentQuantity: number;
    status: string;
    recommendedStock?: number;
    lastRecommendationDate?: string;
  };
  message?: string;
  error?: string;
}

export interface InventoryItemWithRecommendation {
  id: string;
  name: string;
  category: string;
  type?: string;
  size?: string;
  currentStock: number;
  status: string;
  recommendedStock?: number | null;
  reorderQuantity?: number | null;
  hasRecommendation?: boolean;
  recommendationDate?: string;
  forecastedDemand?: number;
  notes?: string;
}

export interface GetInventoryWithRecommendationsResponse {
  success: boolean;
  items?: InventoryItemWithRecommendation[];
  count?: number;
  withRecommendations?: number;
  message?: string;
  error?: string;
}

export interface GetInventoryFilters {
  category?: string;
  type?: string;
  size?: string | null;
}

class RecommendedStockService {
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
   * Import recommended stock from Colab (Admin only)
   */
  async importRecommendations(data: ImportRecommendationsRequest): Promise<ImportRecommendationsResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/recommended-stock/import`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      }
    );

    // Better error handling to see what backend returns
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      console.error('IMPORT ERROR:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return {
        success: false,
        message: errorData.message || errorData.error || `Import failed with status ${response.status}`,
        error: errorData.error || errorData.message || `HTTP ${response.status}`,
      };
    }

    return this.handleResponse<ImportRecommendationsResponse>(response);
  }

  /**
   * Get all recommended stock
   */
  async getAllRecommendations(filters: GetRecommendationsFilters = {}): Promise<GetRecommendationsResponse> {
    const queryParams = new URLSearchParams();
    
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.size !== undefined) {
      queryParams.append('size', filters.size === null ? 'null' : filters.size);
    }
    if (filters.latest !== undefined) {
      queryParams.append('latest', filters.latest.toString());
    }

    const response = await fetch(
      `${API_BASE_URL}/api/recommended-stock?${queryParams}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse<GetRecommendationsResponse>(response);
  }

  /**
   * Get recommended stock for specific item
   */
  async getItemRecommendation(params: GetItemRecommendationParams): Promise<GetItemRecommendationResponse> {
    const queryParams = new URLSearchParams({
      category: params.category,
      type: params.type,
      ...(params.size && { size: params.size })
    });

    const response = await fetch(
      `${API_BASE_URL}/api/recommended-stock/item?${queryParams}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse<GetItemRecommendationResponse>(response);
  }

  /**
   * Get inventory with recommendations (most useful!)
   */
  async getInventoryWithRecommendations(filters: GetInventoryFilters = {}): Promise<GetInventoryWithRecommendationsResponse> {
    const queryParams = new URLSearchParams();
    
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.size !== undefined) {
      queryParams.append('size', filters.size === null ? 'null' : filters.size);
    }

    const response = await fetch(
      `${API_BASE_URL}/api/recommended-stock/inventory?${queryParams}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse<GetInventoryWithRecommendationsResponse>(response);
  }

  /**
   * Get graph-ready data for a specific category and type
   */
  async getGraphData(category: string, type: string): Promise<GetGraphDataResponse> {
    const queryParams = new URLSearchParams({
      category,
      type
    });

    const response = await fetch(
      `${API_BASE_URL}/api/recommended-stock/graph?${queryParams}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse<GetGraphDataResponse>(response);
  }
}

// Export singleton instance
export const recommendedStockService = new RecommendedStockService();

/**
 * Utility functions for frontend sorting and grouping
 */

/**
 * Sort sizes in order: XXS → 5XL
 */
export function sortSizes(sizes: string[]): string[] {
  const sizeOrder: Record<string, number> = {
    'XXS': 1, 'XS': 2, 'S': 3, 'M': 4, 'L': 5,
    'XL': 6, '2XL': 7, '3XL': 8, '4XL': 9, '5XL': 10
  };
  
  return sizes.sort((a, b) => {
    const aOrder = sizeOrder[a.toUpperCase()] || 99;
    const bOrder = sizeOrder[b.toUpperCase()] || 99;
    return aOrder - bOrder;
  });
}

/**
 * Sort numeric sizes (for boots, shoes, etc.)
 */
export function sortNumericSizes(sizes: string[]): string[] {
  return sizes.sort((a, b) => {
    const aNum = parseInt(a) || 0;
    const bNum = parseInt(b) || 0;
    return aNum - bNum;
  });
}

/**
 * Check if a type uses numeric sizes (boots, shoes)
 */
export function isNumericSizeType(type: string): boolean {
  const lower = type.toLowerCase();
  return lower.includes('boot') || lower.includes('shoe') || lower.includes('pvc');
}

/**
 * Group recommendations by type
 */
export function groupByType(recommendations: RecommendedStockItem[]): Record<string, RecommendedStockItem[]> {
  const grouped: Record<string, RecommendedStockItem[]> = {};
  
  recommendations.forEach(rec => {
    const key = `${rec.category} - ${rec.type}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(rec);
  });
  
  return grouped;
}

/**
 * Sort graph data by size (handles both text and numeric sizes)
 * FIX: Proper size ordering for clothing and boots
 */
const CLOTHING_SIZE_ORDER = [
  "XXS", "XS", "S", "M", "L",
  "XL", "2XL", "XXL",
  "3XL", "XXXL",
  "4XL", "5XL"
];

export function sortGraphData(
  data: { size: string; recommendedStock: number }[],
  type?: string
): GraphDataItem[] {
  // BOOTS / NUMERIC
  if (type && type.toUpperCase().includes("BOOT")) {
    return [...data].sort(
      (a, b) => {
        const aNum = Number(a.size) || 0;
        const bNum = Number(b.size) || 0;
        return aNum - bNum;
      }
    );
  }

  // CLOTHING (BAJU, UNIFORM, etc.)
  if (type && (type.toUpperCase().includes("BAJU") || type.toUpperCase().includes("UNIFORM"))) {
    return [...data].sort((a, b) => {
      const aSize = (a.size || 'N/A').toUpperCase().trim();
      const bSize = (b.size || 'N/A').toUpperCase().trim();
      
      const aIndex = CLOTHING_SIZE_ORDER.indexOf(aSize);
      const bIndex = CLOTHING_SIZE_ORDER.indexOf(bSize);

      // If both found in order, use order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one found, put found one first
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return 0;
    });
  }

  // DEFAULT: Try numeric first, then clothing order
  const firstSize = data[0]?.size || 'N/A';
  const isNumeric = !isNaN(Number(firstSize));
  
  if (isNumeric) {
    return [...data].sort(
      (a, b) => {
        const aNum = Number(a.size) || 0;
        const bNum = Number(b.size) || 0;
        return aNum - bNum;
      }
    );
  }
  
  // Try clothing order
  return [...data].sort((a, b) => {
    const aSize = (a.size || 'N/A').toUpperCase().trim();
    const bSize = (b.size || 'N/A').toUpperCase().trim();
    
    const aIndex = CLOTHING_SIZE_ORDER.indexOf(aSize);
    const bIndex = CLOTHING_SIZE_ORDER.indexOf(bSize);

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;

    return 0;
  });
}
