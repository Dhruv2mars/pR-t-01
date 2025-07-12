import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ChatWindow from './components/ChatWindow';
import HistorySidebar from './components/HistorySidebar';
import StatusBar from './components/StatusBar';
import { Conversation, Message, OllamaModel } from './types';

const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemma3:4b');

  const loadConversations = async () => {
    try {
      const convs = await invoke<Conversation[]>('get_conversations');
      setConversations(convs);
      
      // Auto-select the first conversation if none is selected
      if (convs.length > 0 && !selectedConversationId) {
        setSelectedConversationId(convs[0].id);
        loadMessages(convs[0].id);
      }
      // Auto-create a conversation if none exist
      else if (convs.length === 0 && !selectedConversationId) {
        const newConversationId = await invoke<number>('create_conversation');
        setSelectedConversationId(newConversationId);
        // Reload conversations to include the new one
        const updatedConvs = await invoke<Conversation[]>('get_conversations');
        setConversations(updatedConvs);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadModels = async () => {
    try {
      const models = await invoke<OllamaModel[]>('list_models');
      setAvailableModels(models);
      if (models.length > 0 && !models.find(m => m.name === selectedModel)) {
        setSelectedModel(models[0].name);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const loadMessages = async (conversationId: number) => {
    try {
      const msgs = await invoke<Message[]>('get_messages', { conversationId });
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const handleConversationSelect = (id: number) => {
    setSelectedConversationId(id);
    loadMessages(id);
  };

  const handleMessagesUpdate = () => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  };

  const handleConversationsUpdate = () => {
    loadConversations();
  };

  useEffect(() => {
    loadConversations();
    loadModels();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">AI Chat Assistant</h1>
              <div className="flex items-center space-x-3">
                <label htmlFor="model-select" className="text-sm font-medium text-gray-700">
                  Model:
                </label>
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {availableModels.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadModels}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <HistorySidebar
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onConversationSelect={handleConversationSelect}
          onConversationsUpdate={handleConversationsUpdate}
        />
        <div className="flex-1 flex flex-col bg-white">
          <ChatWindow
            conversationId={selectedConversationId}
            messages={messages}
            selectedModel={selectedModel}
            onMessagesUpdate={handleMessagesUpdate}
          />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
};

export default App;