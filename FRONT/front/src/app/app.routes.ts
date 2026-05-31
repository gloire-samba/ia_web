import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ChatComponent } from './components/chat/chat.component';
import { InscriptionComponent } from './components/inscription/inscription.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  // { path: 'inscription', component: InscriptionComponent }, // À activer quand tu auras le composant
  
  // 👉 Le Chat est maintenant protégé !
  { path: 'chat', component: ChatComponent, canActivate: [authGuard] },

  { path: 'inscription', component: InscriptionComponent },
  
  { path: '**', redirectTo: 'login' }
];