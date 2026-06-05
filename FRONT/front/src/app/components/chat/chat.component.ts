import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ChatRequest } from '../../models/chat-request';
import { ChatService } from '../../services/chat.service';
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

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      // 👉 NOUVEAU : La barrière de sécurité de 50 Mo sans rien casser
      if (file.size > 50 * 1024 * 1024) {
        alert("Le fichier est trop volumineux. Veuillez choisir un fichier de moins de 50 Mo.");
        event.target.value = ''; 
        return; 
      }
      this.selectedFile = file;
    }
  }

  removeFile() {
    this.selectedFile = null;
  }

  async sendMessage() {
    if (!this.currentPrompt.trim() && !this.selectedFile) return;

    this.isLoading = true;

    this.messages.push({
      sender: 'user',
      text: this.currentPrompt,
      fileName: this.selectedFile?.name
    });

    const request: ChatRequest = { prompt: this.currentPrompt };
    
    if (this.selectedFile) {
      request.file_name = this.selectedFile.name;
      request.file_base64 = await this.chatService.convertFileToBase64(this.selectedFile);
    }

    this.currentPrompt = '';
    this.selectedFile = null;

    this.chatService.sendMessage(request).subscribe({
      next: (response) => {
        let downloadLink = undefined;

        if (response.output_file_base64 && response.output_file_name) {
          downloadLink = this.chatService.createDownloadUrl(
            response.output_file_base64, 
            response.output_file_name
          );
        }

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

        if (errorTexte.includes('503') || errorTexte.includes('high demand') || errorTexte.includes('UNAVAILABLE')) {
          messageErreur = "L'IA de Google est surchargée. Veuillez réessayer dans quelques minutes ! ⏳";
        } else if (errorTexte.includes('429') || errorTexte.includes('quota')) {
          messageErreur = "Le quota gratuit de l'IA est atteint pour aujourd'hui. 🛑";
        } else {
          messageErreur = "Erreur de communication avec l'IA. ❌";
        }
        
        this.messages.push({
          sender: 'ia',
          text: messageErreur
        });

        this.isLoading = false;
      }
    });
  }
}