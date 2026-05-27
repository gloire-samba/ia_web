import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Chat } from './components/Chat';

function App() {
  return (
    // BrowserRouter remplace la mécanique globale de app.config.ts pour le web
    <BrowserRouter>
      <Routes>
        {/* 1. La route par défaut (quand l'URL est vide) */}
        <Route path="/" element={<Chat />} />
        
        {/* 2. La route de secours (Redirection si l'URL n'existe pas) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;