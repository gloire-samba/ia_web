import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatRequest } from '../models/chat-request';
import { ChatResponse } from '../models/chat-response';
import { ServeurService } from './serveur.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private serveurService = inject(ServeurService); // On injecte notre nouveau service

  // 1. Envoie la requête au serveur (en demandant l'URL au ServeurService)
  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.serveurService.getChatUrl(), request);
  }

  // 2. Utilitaire pour convertir un fichier en Base64
  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  }

  // 3. Utilitaire pour créer un lien de téléchargement
  createDownloadUrl(base64: string, fileName: string): string {
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