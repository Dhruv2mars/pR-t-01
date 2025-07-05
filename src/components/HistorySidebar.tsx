import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Conversation } from '../types';

interface HistorySidebarProps {
  conversations: Conversation[];
  selectedConversationId: number | null;
  onConversationSelect: (id: number) => void;
  onConversationsUpdate: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
  conversations,
  selectedConversationId,
  onConversationSelect,
  onConversationsUpdate,
}) => {
  const handleNewConversation = async () => {
    try {
      const newConversationId = await invoke<number>('create_conversation');
      onConversationsUpdate();
      onConversationSelect(newConversationId);
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert(`Error creating conversation: ${error}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={handleNewConversation}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          + New Conversation
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No conversations yet. Create your first conversation to get started.
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation.id)}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                  selectedConversationId === conversation.id
                    ? 'bg-blue-100 border-blue-300 border'
                    : 'bg-white hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="font-medium text-sm text-gray-800">
                  Conversation #{conversation.id}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDate(conversation.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorySidebar;