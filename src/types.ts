export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  input_type: 'text' | 'image' | 'mixed';
  image_path?: string;
  image_filename?: string;
  image_size?: number;
  timestamp: string;
}

export interface Conversation {
  id: number;
  created_at: string;
}

export interface ChatMessage {
  role: string;
  content: string;
  images?: string[];
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export interface ImageFile {
  file: File;
  preview: string;
  base64: string;
}