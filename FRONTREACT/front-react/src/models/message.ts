export interface Message {
  sender: 'user' | 'ia';
  text: string;
  fileName?: string;
  downloadUrl?: string; 
}