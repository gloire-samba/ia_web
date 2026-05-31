import { useState } from 'react';
import './Chat.css';
import type { Message } from '../../models/message';
import { chatService } from '../../services/chat.service';

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const removeFile = () => setSelectedFile(null);

  const sendMessage = async () => {
    if (!currentPrompt.trim() && !selectedFile) return;

    setIsLoading(true);

    const userMessage: Message = {
      sender: 'user',
      text: currentPrompt,
      fileName: selectedFile?.name
    };
    setMessages(prev => [...prev, userMessage]);

    const request: any = { prompt: currentPrompt };
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

  return (
    <div className="chat-container">
      <div className="messages-area">
        {messages.map((msg, index) => (
          <div key={index} className={`message-bubble ${msg.sender}`}>
            <strong>{msg.sender === 'user' ? 'Vous' : 'IA Bureautique'}</strong>
            <p>{msg.text}</p>
            
            {msg.sender === 'user' && msg.fileName && (
              <div className="file-attachment">📎 {msg.fileName}</div>
            )}

            {msg.sender === 'ia' && msg.downloadUrl && (
              <a href={msg.downloadUrl} download={msg.fileName} className="download-btn">
                ⬇️ Télécharger {msg.fileName}
              </a>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="message-bubble ia loading">
            <em>L'IA réfléchit (et LibreOffice mouline)...</em>
          </div>
        )}
      </div>

      <div className="input-area">
        {selectedFile && (
          <div className="selected-file-badge">
            📎 {selectedFile.name}
            <button onClick={removeFile}>❌</button>
          </div>
        )}

        <div className="controls">
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

          <button className="send-btn" onClick={sendMessage} disabled={isLoading}>
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
};