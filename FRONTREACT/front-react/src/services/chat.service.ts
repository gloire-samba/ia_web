import { environment } from '../environments/environment.development';
import type { ChatRequest } from '../models/chat-request';
import type { ChatResponse } from '../models/chat-response';


export type BackendType = 'spring' | 'django';

class ChatService {
  private currentBackend: BackendType = 'spring';
  private apiUrl = environment.urls[this.currentBackend];

  constructor() {
    console.log(`🔌 Initialisé sur le backend : ${this.currentBackend.toUpperCase()}`);
  }

  setBackend(backend: BackendType) {
    this.currentBackend = backend;
    this.apiUrl = environment.urls[backend];
    console.log(`🔄 Bascule sur le backend : ${backend.toUpperCase()} -> ${this.apiUrl}`);
  }

  getCurrentBackend(): BackendType {
    return this.currentBackend;
  }

  // Utilisation de fetch au lieu de HttpClient
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      // On lève une erreur contenant le texte du serveur pour reproduire la logique Angular
      throw new Error(await response.text());
    }

    return response.json();
  }

  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
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

// On exporte une instance unique pour s'en servir partout
export const chatService = new ChatService();