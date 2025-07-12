import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Message, ChatMessage, ImageFile } from '../types';
import ImageUpload from './ImageUpload';

interface ChatWindowProps {
  conversationId: number | null;
  messages: Message[];
  selectedModel: string;
  onMessagesUpdate: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, messages, selectedModel, onMessagesUpdate }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [showVisionError, setShowVisionError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || !conversationId || isLoading) return;

    const userMessage = input.trim();
    const hasImage = selectedImage !== null;
    
    setInput('');
    setIsLoading(true);
    setShowVisionError(false);

    try {
      let imagePath: string | null = null;
      
      // Save image if present
      if (selectedImage) {
        imagePath = await invoke<string>('save_image_file', {
          conversationId,
          imageData: selectedImage.base64,
          filename: selectedImage.file.name,
        });
      }

      // Save user message
      await invoke('save_message_with_image', {
        conversationId,
        role: 'user',
        content: userMessage || (hasImage ? 'Uploaded an image' : ''),
        inputType: hasImage ? (userMessage ? 'mixed' : 'image') : 'text',
        imagePath,
        imageFilename: selectedImage?.file.name || null,
        imageSize: selectedImage?.file.size || null,
      });

      // Prepare chat history
      const chatHistory: ChatMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        images: msg.image_path ? [msg.image_path] : undefined,
      }));
      
      // Add current message to history
      const currentMessage: ChatMessage = {
        role: 'user',
        content: userMessage || (hasImage ? 'What do you see in this image?' : ''),
      };
      
      if (hasImage && imagePath) {
        currentMessage.images = [imagePath];
      }
      
      chatHistory.push(currentMessage);

      let response: string;
      
      // Send to Ollama
      if (hasImage && imagePath) {
        response = await invoke<string>('send_prompt_with_image', {
          prompt: userMessage || 'What do you see in this image?',
          imagePath,
          model: selectedModel,
        });
      } else {
        response = await invoke<string>('send_prompt_with_history', {
          messages: chatHistory,
          model: selectedModel,
        });
      }

      // Save assistant response
      await invoke('save_message', {
        conversationId,
        role: 'assistant',
        content: response,
      });

      // Clear image selection
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage.preview);
        setSelectedImage(null);
      }

      onMessagesUpdate();
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (error === 'VISION_NOT_SUPPORTED') {
        setShowVisionError(true);
      } else {
        alert(`Error: ${error}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleImageSelect = (imageFile: ImageFile) => {
    setSelectedImage(imageFile);
  };

  const handleImageRemove = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.preview);
      setSelectedImage(null);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  useEffect(() => {
    return () => {
      // Cleanup image preview URL on unmount
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage.preview);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
            <p className="text-gray-500">Type a message or upload an image to begin chatting with the AI.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-2xl ${message.role === 'user' ? 'ml-12' : 'mr-12'}`}>
              <div
                className={`px-4 py-3 rounded-2xl shadow-sm ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900 border border-gray-200'
                }`}
              >
                {/* Image Display */}
                {message.image_path && (
                  <div className="mb-3">
                    <img
                      src={`file://${message.image_path}`}
                      alt={message.image_filename || 'Uploaded image'}
                      className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ maxHeight: '300px' }}
                      onClick={() => {
                        // TODO: Open image in modal
                        window.open(`file://${message.image_path}`, '_blank');
                      }}
                    />
                    {message.image_filename && (
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.image_filename}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Message Content */}
                {message.content && (
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </div>
                )}
              </div>
              
              {/* Timestamp */}
              <div className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-right text-gray-400' : 'text-left text-gray-400'
              }`}>
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="mr-12">
              <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Vision Error Dialog */}
      {showVisionError && (
        <div className="mx-6 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-800">Image processing not supported</h3>
              <p className="text-sm text-amber-700 mt-1">
                The current model (gemma3n:e4b) doesn't support image processing. Your message was sent as text only.
              </p>
            </div>
            <button
              onClick={() => setShowVisionError(false)}
              className="flex-shrink-0 text-amber-600 hover:text-amber-800"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white">
        <div className="p-4">
          {/* Image Preview */}
          {selectedImage && (
            <div className="mb-3">
              <ImageUpload
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                selectedImage={selectedImage}
                disabled={!conversationId || isLoading}
              />
            </div>
          )}
          
          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex items-end space-x-3">
            {/* Image Upload Button */}
            {!selectedImage && (
              <div className="flex-shrink-0">
                <ImageUpload
                  onImageSelect={handleImageSelect}
                  onImageRemove={handleImageRemove}
                  selectedImage={selectedImage}
                  disabled={!conversationId || isLoading}
                />
              </div>
            )}
            
            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  conversationId 
                    ? "Type a message..." 
                    : "Create a new conversation to start chatting"
                }
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50 transition-colors"
                style={{ minHeight: '48px', maxHeight: '120px' }}
                disabled={!conversationId || isLoading}
              />
            </div>
            
            {/* Send Button */}
            <div className="flex-shrink-0">
              <button
                type="submit"
                disabled={(!input.trim() && !selectedImage) || !conversationId || isLoading}
                className="w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22,2 15,22 11,13 2,9"></polygon>
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;