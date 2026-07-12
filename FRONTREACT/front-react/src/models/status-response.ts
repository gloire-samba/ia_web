export interface StatusResponse {
  ticket_id: string;
  status: 'en_cours' | 'termine' | 'erreur';
  text?: string;
  output_file_name?: string;
  output_file_base64?: string;
  error?: string;
}