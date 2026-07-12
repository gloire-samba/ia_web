import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { ChatRequest } from '../../models/chat-request';
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { Message } from '../../models/message';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { AudioRecorderService } from '../../services/audio-recorder.service';
import { Subscription, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { StatusResponse } from '../../models/status-response';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnDestroy {
  private chatService = inject(ChatService);
  private http = inject(HttpClient);
  private audioRecorderService = inject(AudioRecorderService);

  messages: Message[] = [];
  currentPrompt: string = '';
  selectedFile: File | null = null;
  isLoading: boolean = false;
  isRecording: boolean = false;
  
  // 👉 NOUVEAU : Gestion du message de chargement dynamique et du polling
  loadingMessage: string = "L'IA démarre la tâche...";
  private pollingSub?: Subscription;

  // Sécurité : on arrête la vérification si l'utilisateur quitte la page
  ngOnDestroy() {
    this.stopPolling();
  }

  private stopPolling() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.isRecording = false;
      this.isLoading = true;
      this.loadingMessage = "Transcription vocale en cours...";
      try {
        const audioBlob = await this.audioRecorderService.stopRecording();
        const formData = new FormData();
        formData.append('fichier', audioBlob, 'audio.webm');

        this.http.post<any>('https://elgronaldo-web-ia.hf.space/api/transcrire', formData).subscribe({
          next: (data) => {
            if (data.texte && data.texte !== 'SILENCE') {
              this.currentPrompt += (this.currentPrompt ? ' ' : '') + data.texte;
              this.sendMessage(); // Envoi automatique après la voix
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
    this.loadingMessage = "Envoi de la requête et création du ticket... 🎫";

    // On sauvegarde le texte avant de vider le champ
    const texteEnvoye = this.currentPrompt;

    this.messages.push({
      sender: 'user',
      text: texteEnvoye,
      fileName: this.selectedFile?.name
    });

    const request: ChatRequest = { prompt: texteEnvoye };
    
    if (this.selectedFile) {
      request.file_name = this.selectedFile.name;
      request.file_base64 = await this.chatService.convertFileToBase64(this.selectedFile);
    }

    this.currentPrompt = '';
    this.selectedFile = null;

    // 1. Appel initial : on reçoit le ticket en < 0.5 sec
    this.chatService.sendMessage(request).subscribe({
      next: (ticket) => {
        if (ticket && ticket.ticket_id) {
          this.loadingMessage = "L'IA analyse la demande en tâche de fond... ⚙️";
          // 👉 ON PASSE LE TEXTE À LA BOUCLE DE POLLING :
          this.startPolling(ticket.ticket_id);
        } else {
          this.handleError("Erreur : Aucun ticket reçu du serveur.");
        }
      },
      error: (err: HttpErrorResponse) => {
        this.handleHttpError(err);
      }
    });
  }

  // 👉 CORRECTION : On accepte le paramètre prompt pour adapter le message
  private startPolling(ticketId: string) {
    this.stopPolling();

    this.pollingSub = interval(3500).pipe(
      switchMap(() => this.chatService.checkStatus(ticketId)),
      takeWhile((response) => response.status === 'en_cours', true)
    ).subscribe({
      next: (response: StatusResponse) => {
        if (response.status === 'termine') {
          let downloadLink = undefined;
          if (response.output_file_base64 && response.output_file_name) {
            downloadLink = this.chatService.createDownloadUrl(response.output_file_base64, response.output_file_name);
          }
          this.messages.push({
            sender: 'ia', text: response.text || "Tâche terminée avec succès !",
            fileName: response.output_file_name, downloadUrl: downloadLink
          });
          this.isLoading = false;
          this.stopPolling();
        } else if (response.status === 'erreur') {
          this.messages.push({ sender: 'ia', text: `❌ Erreur de l'IA : ${response.error}` });
          this.isLoading = false;
          this.stopPolling();
        } else {
          // 👉 CORRECTION : Un message unique, élégant et passe-partout !
          this.loadingMessage = "L'IA réfléchit et prépare sa réponse... ⚙️";
        }
      },
      error: (err) => {
        console.error("Erreur lors du polling :", err);
        this.handleError("La connexion avec le serveur a été interrompue pendant l'attente.");
        this.stopPolling();
      }
    });
  }

  private handleHttpError(err: HttpErrorResponse) {
    const errorTexte = JSON.stringify(err);
    let messageErreur = "";

    if (errorTexte.includes('503') || errorTexte.includes('high demand') || errorTexte.includes('UNAVAILABLE')) {
      messageErreur = "L'IA de Google est surchargée. Veuillez réessayer dans quelques minutes ! ⏳";
    } else if (errorTexte.includes('429') || errorTexte.includes('quota')) {
      messageErreur = "Le quota gratuit de l'IA est atteint pour aujourd'hui. 🛑";
    } else {
      messageErreur = "Erreur de communication avec l'IA. ❌";
    }
    
    this.handleError(messageErreur);
  }

  private handleError(message: string) {
    this.messages.push({
      sender: 'ia',
      text: message
    });
    this.isLoading = false;
  }
}