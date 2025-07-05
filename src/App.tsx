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
  const [selectedModel, setSelectedModel] = useState<string>('gemma3n:latest');

  const loadConversations = async () => {
    try {
      const convs = await invoke<Conversation[]>('get_conversations');
      setConversations(convs);
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
    <div className="h-screen flex flex-col bg-white">
      <div className="flex-1 flex overflow-hidden">
        <HistorySidebar
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onConversationSelect={handleConversationSelect}
          onConversationsUpdate={handleConversationsUpdate}
        />
        <div className="flex-1 flex flex-col">
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <label htmlFor="model-select" className="text-sm font-medium text-gray-700">
                Model:
              </label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableModels.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
              <button
                onClick={loadModels}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Refresh Models
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatWindow
              conversationId={selectedConversationId}
              messages={messages}
              selectedModel={selectedModel}
              onMessagesUpdate={handleMessagesUpdate}
            />
          </div>
        </div>
      </div>
      <StatusBar />
    </div>
  );
};

export default App;