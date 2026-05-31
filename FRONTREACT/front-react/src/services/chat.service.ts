import { environment } from '../environments/environment.development';
import type { ChatRequest } from '../models/chat-request';
import type { ChatResponse } from '../models/chat-response';

import { apiFetch } from './jwt.interceptor'; // 👉 Import de ton intercepteur sécurisé

export type BackendType = 'spring' | 'django';

class ChatService {
  private currentBackend: BackendType = 'spring';
  private apiUrl = environment.urls[this.currentBackend];

  constructor() {
    // 👉 Récupération au démarrage de l'application après la redirection
    const savedBackend = sessionStorage.getItem('activeBackend') as BackendType;
    if (savedBackend === 'spring' || savedBackend === 'django') {
      this.currentBackend = savedBackend;
    }
    this.apiUrl = environment.urls[this.currentBackend];
    console.log(`🔌 Initialisé sur le backend : ${this.currentBackend.toUpperCase()}`);
  }

  setBackend(backend: BackendType) {
    this.currentBackend = backend;
    this.apiUrl = environment.urls[backend];
    // 👉 Persistance du choix
    sessionStorage.setItem('activeBackend', backend);
    console.log(`🔄 Bascule sur le backend : ${backend.toUpperCase()} -> ${this.apiUrl}`);
  }

  getCurrentBackend(): BackendType {
    return this.currentBackend;
  }

  // 👉 MODIFICATION : Utilisation de apiFetch au lieu de fetch natif
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await apiFetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
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

  // Correction de l'erreur TS6133 précédente : le paramètre inutilisé fileName a été retiré
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