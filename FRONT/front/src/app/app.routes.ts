import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';

import { InscriptionComponent } from './components/inscription/inscription.component';
import { authGuard } from './guards/auth.guard';

// 👉 Nouveaux imports pour l'espace Admin
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AdminUtilisateursComponent } from './components/admin-utilisateurs/admin-utilisateurs.component';
import { AdminVisagesComponent } from './components/admin-visages/admin-visages.component';
import { AdminVisageFormComponent } from './components/admin-visage-form/admin-visage-form.component';
import { ChatComponent } from './components/chat/chat.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'inscription', component: InscriptionComponent },
  { path: 'chat', component: ChatComponent, canActivate: [authGuard] },
  
  // 👉 Les Routes Administrateur
  { 
    path: 'admin', 
    component: AdminDashboardComponent, 
    canActivate: [authGuard], 
    children: [
      { path: '', redirectTo: 'utilisateurs', pathMatch: 'full' },
      { path: 'utilisateurs', component: AdminUtilisateursComponent },
      { path: 'visages', component: AdminVisagesComponent },
      { path: 'visages/nouveau', component: AdminVisageFormComponent },
      { path: 'visages/modifier/:id', component: AdminVisageFormComponent }
    ]
  },
  
  { path: '**', redirectTo: 'login' }
];