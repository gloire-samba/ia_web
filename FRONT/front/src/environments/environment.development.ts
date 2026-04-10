export const environment = {
  production: false,
  
  // Le dictionnaire de tous tes serveurs
  urls: {
    spring: 'http://localhost:8080/api/chat',  // Le relais Java
    django: 'http://localhost:8000/api/chat',  // Le futur relais Django
  }
};