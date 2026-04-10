import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ChatRequest } from '../../models/chat-request';
import { BackendType, ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { Message } from '../../models/message';
import { HttpErrorResponse } from '@angular/common/http';


@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {
  private chatService = inject(ChatService);

  messages: Message[] = [];
  currentPrompt: string = '';
  selectedFile: File | null = null;
  isLoading: boolean = false;

  selectedBackend: BackendType = 'spring';

  constructor() {
    // Au démarrage, on demande au service quel est le serveur actif
    this.selectedBackend = this.chatService.getCurrentBackend();
  }

  // <-- NOUVEAU : La fonction déclenchée par les boutons
  onBackendChange(backend: BackendType) {
    this.selectedBackend = backend;
    this.chatService.setBackend(backend);
  }

  // Gère la sélection du fichier via l'input
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  // Enlève le fichier sélectionné
  removeFile() {
    this.selectedFile = null;
  }

  async sendMessage() {
    if (!this.currentPrompt.trim() && !this.selectedFile) return;

    this.isLoading = true;

    // 1. On affiche le message de l'utilisateur dans l'interface
    this.messages.push({
      sender: 'user',
      text: this.currentPrompt,
      fileName: this.selectedFile?.name
    });

    // 2. On prépare la requête pour le back-end
    const request: ChatRequest = { prompt: this.currentPrompt };
    
    if (this.selectedFile) {
      request.file_name = this.selectedFile.name;
      request.file_base64 = await this.chatService.convertFileToBase64(this.selectedFile);
    }

    // On vide le champ de texte et le fichier
    this.currentPrompt = '';
    this.selectedFile = null;

    // 3. On appelle l'IA
    this.chatService.sendMessage(request).subscribe({
      next: (response) => {
        let downloadLink = undefined;

        // Si l'IA a généré un fichier, on crée le lien de téléchargement
        if (response.output_file_base64 && response.output_file_name) {
          downloadLink = this.chatService.createDownloadUrl(
            response.output_file_base64, 
            response.output_file_name
          );
        }

        // On ajoute la réponse de l'IA à l'interface
        this.messages.push({
          sender: 'ia',
          text: response.text,
          fileName: response.output_file_name,
          downloadUrl: downloadLink
        });
        
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        const errorTexte = JSON.stringify(err);
        let messageErreur = "";

        // On cherche les mots-clés typiques
        if (errorTexte.includes('503') || errorTexte.includes('high demand') || errorTexte.includes('UNAVAILABLE')) {
          messageErreur = "L'IA de Google est actuellement surchargée par un pic d'utilisation mondial. Veuillez réessayer dans quelques minutes ! ⏳";
        } else if (errorTexte.includes('429') || errorTexte.includes('quota')) {
          messageErreur = "Le quota gratuit de l'IA est atteint pour aujourd'hui. 🛑";
        } else {
          messageErreur = "Erreur de communication avec l'IA. ❌";
        }
        
        // On ajoute le message d'erreur comme si c'était une réponse de l'IA
        this.messages.push({
          sender: 'ia',
          text: messageErreur
        });

        // TRÈS IMPORTANT : On arrête le chargement même en cas d'erreur
        this.isLoading = false;
        
        console.error("Détail technique de l'erreur :", err);
      }
    });
  }
}
