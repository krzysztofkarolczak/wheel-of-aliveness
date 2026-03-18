export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hidden?: boolean;
}

export interface DimensionResponse {
  dimensionId: string;
  rating: number;
  lettingGo: string;
  invitingIn: string;
  conversationSummary?: string;
}

export interface Dimension {
  id: string;
  name: string;
  introQuestion: string;
  deepeningPrompts: string[];
  color: string;
}
