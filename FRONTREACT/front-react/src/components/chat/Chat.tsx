import { useState, useRef, useEffect } from 'react';
import './Chat.css';
import type { Message } from '../../models/message';
import { chatService } from '../../services/chat.service';
import { AudioRecorderService } from '../../services/audio-recorder.service';

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false); 
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert("Le fichier est trop volumineux. Veuillez choisir un fichier de moins de 50 Mo.");
        event.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeFile = () => setSelectedFile(null);

  // 👉 CORRECTION : Accepte le texte forcé par le microphone
  const sendMessage = async (texteForce?: string | React.MouseEvent | React.KeyboardEvent) => {
    const texteAEnvoyer = typeof texteForce === 'string' ? texteForce : currentPrompt;
    
    if (!texteAEnvoyer.trim() && !selectedFile) {
      setIsLoading(false); 
      return;
    }

    setIsLoading(true);

    const userMessage: Message = {
      sender: 'user',
      text: texteAEnvoyer,
      fileName: selectedFile?.name
    };
    setMessages(prev => [...prev, userMessage]);

    const request: any = { prompt: texteAEnvoyer };
    if (selectedFile) {
      request.file_name = selectedFile.name;
      request.file_base64 = await chatService.convertFileToBase64(selectedFile);
    }

    setCurrentPrompt('');
    setSelectedFile(null);

    try {
      const response = await chatService.sendMessage(request);
      let downloadLink: string | undefined = undefined;

      if (response.output_file_base64 && response.output_file_name) {
        downloadLink = chatService.createDownloadUrl(response.output_file_base64);
      }

      setMessages(prev => [...prev, {
        sender: 'ia',
        text: response.text,
        fileName: response.output_file_name,
        downloadUrl: downloadLink
      }]);
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

      setMessages(prev => [...prev, { sender: 'ia', text: messageErreur }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsLoading(true);
      try {
        const audioBlob = await AudioRecorderService.stopRecording();
        const formData = new FormData();
        formData.append('fichier', audioBlob, 'audio.webm');

        // 👉 On pointe directement sur le Cloud Hugging Face pour l'audio
        const response = await fetch('https://elgronaldo-web-ia.hf.space/api/transcrire', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) throw new Error("Erreur réseau");
        
        const data = await response.json();
        
        if (data.texte && data.texte !== 'SILENCE') {
          const nouveauTexte = currentPrompt + (currentPrompt ? ' ' : '') + data.texte;
          setCurrentPrompt(''); 
          await sendMessage(nouveauTexte); // 👉 L'ENVOI AUTOMATIQUE
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
            <em>L'IA réfléchit (et LibreOffice mouline)...</em>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        {selectedFile && (
          <div className="selected-file-badge">
            📎 {selectedFile.name}
            <button onClick={removeFile}>❌</button>
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