import { Routes } from '@angular/router';
import { ChatComponent } from './components/chat/chat.component'; // Vérifie que le chemin est correct selon tes dossiers

export const routes: Routes = [
  // 1. La route par défaut (quand l'URL est vide)
  { 
    path: '', 
    component: ChatComponent 
  },
  
  // 2. La route de secours (si l'utilisateur tape une URL qui n'existe pas, on le ramène à l'accueil)
  { 
    path: '**', 
    redirectTo: '' 
  }
];