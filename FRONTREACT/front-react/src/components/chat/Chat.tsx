import { useState, useRef, useEffect } from 'react';
import './Chat.css';
import type { Message } from '../../models/message';
import { chatService } from '../../services/chat.service';
import { AudioRecorderService } from '../../services/audio-recorder.service';
import type { StatusResponse } from '../../models/status-response';

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  
  // 👉 CORRECTION : Tableau de fichiers
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false); 
  const [loadingMessage, setLoadingMessage] = useState("L'IA démarre la tâche...");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (selectedFiles.length >= 2) {
        alert("Vous ne pouvez joindre que 2 fichiers maximum.");
        event.target.value = '';
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        alert("Le fichier est trop volumineux. Veuillez choisir un fichier de moins de 15 Mo.");
        event.target.value = '';
        return;
      }
      setSelectedFiles(prev => [...prev, file]);
      event.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleError = (message: string) => {
    setMessages(prev => [...prev, { sender: 'ia', text: message }]);
    setIsLoading(false);
    stopPolling();
  };

  const startPolling = (ticketId: string) => {
    stopPolling(); 

    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        const response: StatusResponse = await chatService.checkStatus(ticketId);

        if (response.status === 'termine') {
          let downloadLink: string | undefined = undefined;
          if (response.output_file_base64 && response.output_file_name) {
            downloadLink = chatService.createDownloadUrl(response.output_file_base64);
          }
          setMessages(prev => [...prev, {
            sender: 'ia', text: response.text || "Tâche terminée avec succès !",
            fileName: response.output_file_name, downloadUrl: downloadLink
          }]);
          setIsLoading(false);
          stopPolling();
        } else if (response.status === 'erreur') {
          handleError(`❌ Erreur de l'IA : ${response.error}`);
        } else {
          setLoadingMessage("L'IA réfléchit et prépare sa réponse... ⚙️");
        }
      } catch (err: any) {
        console.error("Erreur lors du polling :", err);
        handleError("La connexion avec le serveur a été interrompue pendant l'attente.");
      }
    }, 3500);
  };

  const sendMessage = async (texteForce?: string | React.MouseEvent | React.KeyboardEvent) => {
    const texteAEnvoyer = typeof texteForce === 'string' ? texteForce : currentPrompt;
    
    if (!texteAEnvoyer.trim() && selectedFiles.length === 0) {
      setIsLoading(false); 
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Envoi de la requête et création du ticket... 🎫");

    const fileNames = selectedFiles.map(f => f.name).join(', ');

    const userMessage: Message = {
      sender: 'user',
      text: texteAEnvoyer,
      fileName: fileNames || undefined
    };
    setMessages(prev => [...prev, userMessage]);

    const request: any = { prompt: texteAEnvoyer, fichiers: [] };
    
    for (const file of selectedFiles) {
      const base64 = await chatService.convertFileToBase64(file);
      request.fichiers.push({ file_name: file.name, file_base64: base64 });
    }

    setCurrentPrompt('');
    setSelectedFiles([]);

    try {
      const ticket = await chatService.sendMessage(request);
      if (ticket && ticket.ticket_id) {
        setLoadingMessage("L'IA analyse la demande en tâche de fond... ⚙️");
        startPolling(ticket.ticket_id);
      } else {
        handleError("Erreur : Aucun ticket reçu du serveur.");
      }
    } catch (error: any) {
      const errorTexte = error.message || JSON.stringify(error);
      let messageErreur = "";

      if (errorTexte.includes('503') || errorTexte.includes('high demand') || errorTexte.includes('UNAVAILABLE')) {
        messageErreur = "L'IA de Google est surchargée. Veuillez réessayer dans quelques minutes ! ⏳";
      } else if (errorTexte.includes('429') || errorTexte.includes('quota')) {
        messageErreur = "Le quota gratuit de l'IA est atteint pour aujourd'hui. 🛑";
      } else {
        messageErreur = "Erreur de communication avec l'IA. ❌";
      }

      handleError(messageErreur);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsLoading(true);
      setLoadingMessage("Transcription vocale en cours...");
      try {
        const audioBlob = await AudioRecorderService.stopRecording();
        const formData = new FormData();
        formData.append('fichier', audioBlob, 'audio.webm');

        const response = await fetch('https://elgronaldo-web-ia.hf.space/api/transcrire', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) throw new Error("Erreur réseau");
        
        const data = await response.json();
        
        if (data.texte && data.texte !== 'SILENCE') {
          const nouveauTexte = currentPrompt + (currentPrompt ? ' ' : '') + data.texte;
          setCurrentPrompt(''); 
          await sendMessage(nouveauTexte);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Erreur de transcription audio:", error);
        alert("Erreur lors de la transcription audio.");
        setIsLoading(false);
      }
    } else {
      try {
        await AudioRecorderService.startRecording();
        setIsRecording(true);
      } catch (err) {
        alert("Impossible d'accéder au micro.");
      }
    }
  };

  return (
    <div className="chat-container">
      <div className="messages-area">
        {messages.map((msg, index) => (
          <div key={index} className={`message-bubble ${msg.sender}`}>
            <strong>{msg.sender === 'user' ? 'Vous' : 'IA Bureautique'}</strong>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.text}</p>
            
            {msg.sender === 'user' && msg.fileName && (
              <div className="file-attachment">📎 {msg.fileName}</div>
            )}

            {msg.sender === 'ia' && msg.downloadUrl && (
              <div style={{ marginTop: '10px' }}>
                {(msg.fileName?.endsWith('.jpg') || msg.fileName?.endsWith('.png')) && (
                  <img 
                    src={msg.downloadUrl} 
                    alt="Image générée" 
                    style={{ maxWidth: '100%', borderRadius: '8px', display: 'block', marginBottom: '10px', border: '1px solid #cbd5e1' }} 
                  />
                )}
                <a href={msg.downloadUrl} download={msg.fileName} className="download-btn">
                  ⬇️ Télécharger {msg.fileName}
                </a>
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="message-bubble ia loading">
            <em>{loadingMessage}</em>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        
        {/* Conteneur flex pour afficher plusieurs fichiers */}
        {selectedFiles.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {selectedFiles.map((file, index) => (
              <div key={index} className="selected-file-badge" style={{ marginBottom: 0 }}>
                📎 {file.name}
                <button onClick={() => removeFile(index)}>❌</button>
              </div>
            ))}
          </div>
        )}

        <div className="controls">
          <button 
            className={`btn-mic ${isRecording ? 'recording' : ''}`} 
            onClick={toggleRecording} 
            disabled={isLoading} 
            title="Cliquez pour parler"
          >
            {!isRecording && <span>🎤</span>}
            {isRecording && <span>🛑</span>}
          </button>

          <input type="file" id="fileUpload" onChange={onFileSelected} hidden />
          <label htmlFor="fileUpload" className="file-btn">📎 Pièce jointe</label>

          <textarea 
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder="Demandez-moi de modifier un fichier, de créer un rapport..."
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />

          <button className="send-btn" onClick={sendMessage} disabled={isLoading || isRecording}>
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
};