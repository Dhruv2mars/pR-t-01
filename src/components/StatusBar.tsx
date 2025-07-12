import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

const StatusBar: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const connected = await invoke<boolean>('check_ollama');
      setIsConnected(connected);
    } catch (error) {
      console.error('Error checking Ollama connection:', error);
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (isChecking) return 'bg-yellow-500';
    if (isConnected === null) return 'bg-gray-500';
    return isConnected ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking connection...';
    if (isConnected === null) return 'Unknown status';
    if (isConnected) return 'Connected to Ollama';
    return 'Ollama not running. Run "ollama run gemma3n:latest" in a terminal.';
  };

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} shadow-sm`}></div>
        <span className="text-sm text-gray-600 font-medium">{getStatusText()}</span>
      </div>
      <div className="flex items-center space-x-3">
        <button
          onClick={checkConnection}
          disabled={isChecking}
          className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors border border-gray-300 font-medium"
        >
          {isChecking ? (
            <span className="flex items-center space-x-1">
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Checking...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>Refresh</span>
            </span>
          )}
        </button>
        <div className="text-xs text-gray-400">
          pR-t-01 v0.1.0
        </div>
      </div>
    </div>
  );
};

export default StatusBar;