import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  constructor() {}

  async startRecording(): Promise<void> {
    try {
      // 1. Demande l'autorisation d'utiliser le micro
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 2. Initialise l'enregistreur
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      // 3. Stocke les morceaux d'audio pendant qu'on parle
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (err) {
      console.error('Erreur d\'accès au microphone:', err);
      throw new Error("L'accès au microphone a été refusé ou n'est pas disponible.");
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("L'enregistrement n'a pas été démarré."));
        return;
      }

      this.mediaRecorder.onstop = () => {
        // On crée un gros fichier avec tous les morceaux
        // Le format audio/flac est idéal pour Google Gemini
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/flac' });
        
        // On coupe l'accès au micro (très important pour que le point rouge disparaisse du navigateur)
        const tracks = this.mediaRecorder?.stream.getTracks();
        tracks?.forEach(track => track.stop());

        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }
}