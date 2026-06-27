let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

export const AudioRecorderService = {
  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Erreur d\'accès au microphone:', err);
      throw new Error("L'accès au microphone a été refusé ou n'est pas disponible.");
    }
  },

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder) {
        reject(new Error("L'enregistrement n'a pas été démarré."));
        return;
      }

      mediaRecorder.onstop = () => {
        // Le format audio/flac est idéal pour Google Gemini
        const audioBlob = new Blob(audioChunks, { type: 'audio/flac' });
        
        // On coupe l'accès au micro (très important pour que le point rouge disparaisse)
        const tracks = mediaRecorder?.stream.getTracks();
        tracks?.forEach(track => track.stop());
        
        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  }
};