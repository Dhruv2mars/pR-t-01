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
    <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
        <span className="text-sm text-gray-700">{getStatusText()}</span>
      </div>
      <button
        onClick={checkConnection}
        disabled={isChecking}
        className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded disabled:opacity-50"
      >
        {isChecking ? 'Checking...' : 'Refresh'}
      </button>
    </div>
  );
};

export default StatusBar;