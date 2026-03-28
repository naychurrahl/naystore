/**
 * API Fetch Utility
 * Supports all HTTP methods with headers and data
 * 
 * Usage Examples:
 * 
 * GET Request:
 * const data = await apiFetch('https://api.example.com/users');
 * 
 * POST Request with data:
 * const result = await apiFetch('https://api.example.com/users', {
 *   method: 'POST',
 *   data: { name: 'John', email: 'john@example.com' }
 * });
 * 
 * PUT Request with custom headers:
 * const updated = await apiFetch('https://api.example.com/users/1', {
 *   method: 'PUT',
 *   headers: { 'Authorization': 'Bearer token123' },
 *   data: { name: 'Jane' }
 * });
 * 
 * DELETE Request:
 * const deleted = await apiFetch('https://api.example.com/users/1', {
 *   method: 'DELETE'
 * });
 */

import React from 'react';

export class APIError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
  }
}

/**
 * Main API fetch function
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Configuration options
 * @param {string} options.method - HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
 * @param {Object} options.headers - Custom headers
 * @param {Object|FormData} options.data - Request body data
 * @param {boolean} options.json - Whether to parse response as JSON (default: true)
 * @param {AbortSignal} options.signal - AbortController signal for cancellation
 * @param {number} options.timeout - Request timeout in milliseconds
 * @returns {Promise<any>} - Parsed response data
 */
export async function apiFetch(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    data = null,
    json = true,
    signal = null,
    timeout = 30000
  } = options;

  // Setup abort controller for timeout
  const controller = new AbortController();
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    // Build request configuration
    const config = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: signal || controller.signal
    };

    // Add body for methods that support it
    if (data && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      if (data instanceof FormData) {
        // Remove Content-Type header for FormData (browser will set it with boundary)
        delete config.headers['Content-Type'];
        config.body = data;
      } else {
        config.body = JSON.stringify(data);
      }
    }

    // Make the request
    const response = await fetch(url, config);

    // Clear timeout
    if (timeoutId) clearTimeout(timeoutId);

    // Handle HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || response.statusText;
      } catch {
        errorMessage = errorText || response.statusText;
      }

      throw new APIError(
        errorMessage,
        response.status,
        response
      );
    }

    // Parse response
    if (json) {
      const responseText = await response.text();
      return responseText ? JSON.parse(responseText) : null;
    } else {
      return response;
    }

  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new APIError('Request timeout', 408, null);
    }

    if (error instanceof APIError) {
      throw error;
    }

    // Network or other errors
    throw new APIError(
      error.message || 'Network request failed',
      0,
      null
    );
  }
}

/**
 * Convenience methods for common HTTP operations
 */
export const api = {
  /**
   * GET request
   */
  get: (url, options = {}) => apiFetch(url, { ...options, method: 'GET' }),

  /**
   * POST request
   */
  post: (url, data, options = {}) => apiFetch(url, { ...options, method: 'POST', data }),

  /**
   * PUT request
   */
  put: (url, data, options = {}) => apiFetch(url, { ...options, method: 'PUT', data }),

  /**
   * PATCH request
   */
  patch: (url, data, options = {}) => apiFetch(url, { ...options, method: 'PATCH', data }),

  /**
   * DELETE request
   */
  delete: (url, options = {}) => apiFetch(url, { ...options, method: 'DELETE' }),

  /**
   * HEAD request
   */
  head: (url, options = {}) => apiFetch(url, { ...options, method: 'HEAD', json: false }),

  /**
   * OPTIONS request
   */
  options: (url, options = {}) => apiFetch(url, { ...options, method: 'OPTIONS' })
};

/**
 * React Hook for API requests
 * 
 * Usage:
 * const { data, loading, error, refetch } = useAPI('https://api.example.com/data');
 */
export function useAPI(url, options = {}) {
  const [state, setState] = React.useState({
    data: null,
    loading: true,
    error: null
  });

  const fetchData = React.useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiFetch(url, options);
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      setState({ data: null, loading: false, error });
      throw error;
    }
  }, [url, JSON.stringify(options)]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData
  };
}

export default api;