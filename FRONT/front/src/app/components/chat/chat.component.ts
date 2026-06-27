import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ChatRequest } from '../../models/chat-request';
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { Message } from '../../models/message';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { AudioRecorderService } from '../../services/audio-recorder.service';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {
  private chatService = inject(ChatService);
  private http = inject(HttpClient);
  private audioRecorderService = inject(AudioRecorderService);

  messages: Message[] = [];
  currentPrompt: string = '';
  selectedFile: File | null = null;
  isLoading: boolean = false;
  isRecording: boolean = false;

  async toggleRecording() {
    if (this.isRecording) {
      this.isRecording = false;
      this.isLoading = true;
      try {
        const audioBlob = await this.audioRecorderService.stopRecording();
        const formData = new FormData();
        formData.append('fichier', audioBlob, 'audio.webm');

        this.http.post<any>('https://elgronaldo-web-ia.hf.space/api/transcrire', formData).subscribe({
          next: (data) => {
            if (data.texte && data.texte !== 'SILENCE') {
              this.currentPrompt += (this.currentPrompt ? ' ' : '') + data.texte;
              this.sendMessage(); // 👉 L'ENVOI AUTOMATIQUE
            } else {
              this.isLoading = false;
            }
          },
          error: (err) => {
            console.error("Erreur de transcription :", err);
            this.isLoading = false;
          }
        });
      } catch (err) {
        console.error(err);
        this.isLoading = false;
      }
    } else {
      try {
        await this.audioRecorderService.startRecording();
        this.isRecording = true;
      } catch (err) {
        alert("Impossible d'accéder au micro.");
      }
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
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