export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
  imageUrl?: string;
  isApiTriggered?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

export enum AppMode {
  CHAT = 'CHAT',
  LIVE = 'LIVE'
}

export interface NexusSystemConfig {
  userApiKey: string; // The key the user generates to use the 'URL API'
  remoteEndpoint: string; // If they still want to connect to an external custom brain
}

export interface AudioVisualizerProps {
  isListening: boolean;
  isTalking: boolean;
  volume: number;
}