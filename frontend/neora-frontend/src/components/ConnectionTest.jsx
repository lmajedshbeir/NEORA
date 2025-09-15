import React, { useState } from 'react';
import apiClient from '../api/client';

const ConnectionTest = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await apiClient.get('/connection-test');
      setResult({
        success: true,
        data: response.data
      });
    } catch (error) {
      setResult({
        success: false,
        error: error.response?.data || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Connection Test</h3>
      
      <button
        onClick={testConnection}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Backend Connection'}
      </button>

      {result && (
        <div className="mt-4 p-3 rounded">
          {result.success ? (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <h4 className="font-semibold">✅ Connection Successful!</h4>
              <pre className="mt-2 text-sm">{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          ) : (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <h4 className="font-semibold">❌ Connection Failed!</h4>
              <pre className="mt-2 text-sm">{JSON.stringify(result.error, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionTest;
