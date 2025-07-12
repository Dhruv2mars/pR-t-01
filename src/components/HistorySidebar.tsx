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
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <button
          onClick={handleNewConversation}
          className="w-full bg-blue-500 text-white px-4 py-3 rounded-xl hover:bg-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>New Conversation</span>
        </button>
      </div>
      
      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Create your first conversation to get started with the AI assistant.
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation.id)}
                className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedConversationId === conversation.id
                    ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm truncate ${
                      selectedConversationId === conversation.id
                        ? 'text-blue-900'
                        : 'text-gray-900 group-hover:text-gray-800'
                    }`}>
                      Conversation #{conversation.id}
                    </div>
                    <div className={`text-xs mt-1 ${
                      selectedConversationId === conversation.id
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    }`}>
                      {formatDate(conversation.created_at)}
                    </div>
                  </div>
                  
                  {/* Active indicator */}
                  {selectedConversationId === conversation.id && (
                    <div className="flex-shrink-0 ml-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </div>
                
                {/* Hover effect indicator */}
                <div className={`mt-2 h-0.5 rounded-full transition-all duration-200 ${
                  selectedConversationId === conversation.id
                    ? 'bg-blue-300'
                    : 'bg-transparent group-hover:bg-gray-300'
                }`}></div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default HistorySidebar;