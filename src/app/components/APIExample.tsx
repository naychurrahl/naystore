import { useState } from 'react';
import { api, APIError } from '../utils/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * Example component demonstrating the API fetch utility
 * This shows how to use the API utility for various HTTP methods
 */
export function APIExample() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async (type: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;

      switch (type) {
        case 'GET':
          // Example GET request
          response = await api.get('https://jsonplaceholder.typicode.com/posts/1');
          break;

        case 'POST':
          // Example POST request with data
          response = await api.post('https://jsonplaceholder.typicode.com/posts', {
            title: 'New Post',
            body: 'This is the content of the post',
            userId: 1
          });
          break;

        case 'PUT':
          // Example PUT request with custom headers
          response = await api.put(
            'https://jsonplaceholder.typicode.com/posts/1',
            {
              id: 1,
              title: 'Updated Post',
              body: 'Updated content',
              userId: 1
            },
            {
              headers: {
                'Custom-Header': 'custom-value'
              }
            }
          );
          break;

        case 'PATCH':
          // Example PATCH request
          response = await api.patch('https://jsonplaceholder.typicode.com/posts/1', {
            title: 'Patched Title'
          });
          break;

        case 'DELETE':
          // Example DELETE request
          response = await api.delete('https://jsonplaceholder.typicode.com/posts/1');
          break;

        default:
          throw new Error('Unknown request type');
      }

      setResult(response);
    } catch (err) {
      if (err instanceof APIError) {
        setError(`API Error (${err.status}): ${err.message}`);
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="max-w-4xl mx-auto p-6 rounded-xl"
      style={{ 
        backgroundColor: 'var(--color-product-card)',
        border: '1px solid var(--color-border)'
      }}
    >
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        API Fetch Utility Demo
      </h2>
      <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
        Test different HTTP methods using the API utility. Click a button to make a request.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
          <button
            key={method}
            onClick={() => handleRequest(method)}
            disabled={loading}
            className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--color-primary)',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
            }}
          >
            {method}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center gap-3 p-4 rounded-lg mb-4" style={{ backgroundColor: 'var(--color-primary-light)' }}>
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
          <span style={{ color: 'var(--color-primary)' }}>Making request...</span>
        </div>
      )}

      {/* Success State */}
      {result && !loading && (
        <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: 'var(--color-success-light)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5" style={{ color: 'var(--color-success)' }} />
            <span className="font-semibold" style={{ color: 'var(--color-success)' }}>
              Success!
            </span>
          </div>
          <pre 
            className="text-sm overflow-x-auto p-3 rounded"
            style={{ 
              backgroundColor: 'white',
              color: 'var(--color-text-primary)'
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)' }}>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5" style={{ color: 'var(--color-error)' }} />
            <span className="font-semibold" style={{ color: 'var(--color-error)' }}>
              {error}
            </span>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
        <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          How to Use the API Utility:
        </h3>
        <pre 
          className="text-xs overflow-x-auto p-3 rounded"
          style={{ 
            backgroundColor: 'white',
            color: 'var(--color-text-primary)'
          }}
        >
{`// Import the API utility
import { api } from './utils/api';

// GET request
const data = await api.get('https://api.example.com/users');

// POST request
const result = await api.post('https://api.example.com/users', {
  name: 'John',
  email: 'john@example.com'
});

// PUT request with custom headers
const updated = await api.put(
  'https://api.example.com/users/1',
  { name: 'Jane' },
  { headers: { 'Authorization': 'Bearer token' } }
);

// PATCH request
const patched = await api.patch('https://api.example.com/users/1', {
  name: 'Updated Name'
});

// DELETE request
await api.delete('https://api.example.com/users/1');`}
        </pre>
      </div>
    </div>
  );
}
