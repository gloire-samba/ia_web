import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatRequest } from '../models/chat-request';
import { ChatResponse } from '../models/chat-response';
import { environment } from '../../environments/environment.development';

// 1. On définit les serveurs possibles pour la sécurité
export type BackendType = 'spring' | 'django' ;

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  // 2. Le serveur par défaut au démarrage
  private currentBackend: BackendType = 'spring'; 
  private apiUrl = environment.urls[this.currentBackend];
  

  constructor(private http: HttpClient) {
    console.log(`🔌 Initialisé sur le backend : ${this.currentBackend.toUpperCase()}`);
  }

  // 3. La méthode magique appelée par les boutons de l'interface
  setBackend(backend: BackendType) {
    this.currentBackend = backend;
    this.apiUrl = environment.urls[backend];
    // 👉 Sauvegarde indispensable avant de quitter la page
    sessionStorage.setItem('activeBackend', backend);
  }

  getCurrentBackend(): BackendType {
    return this.currentBackend;
  }

  // 1. Envoie la requête au serveur
  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, request);
  }

  // 2. Utilitaire pour convertir un fichier en Base64 avant l'envoi
  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // FileReader rajoute "data:image/png;base64," au début. 
        // On le coupe pour n'envoyer que le code pur au Python.
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  }

  // 3. Utilitaire pour créer un lien de téléchargement depuis le Base64 reçu
  createDownloadUrl(base64: string, fileName: string): string {
    // Détecte le type MIME (très basique, on laisse le navigateur gérer le binaire)
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/octet-stream' });
    
    return URL.createObjectURL(blob); // Crée une URL locale téléchargeable
  }
}
