import { serveurService } from './serveur.service';
import { apiFetch } from './jwt.interceptor'; // Utilise ton interceptor s'il existe, sinon fetch classique
import type { ChatRequest } from '../models/chat-request';
import type { ChatResponse } from '../models/chat-response';

class ChatService {
  
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await apiFetch(serveurService.getChatUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  }

  createDownloadUrl(base64: string): string {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/octet-stream' });
    return URL.createObjectURL(blob);
  }
}

export const chatService = new ChatService();