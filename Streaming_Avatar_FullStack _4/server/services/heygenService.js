import { config } from '../config/config.js';

class HeygenService {
  constructor() {
    this.apiKey = config.heygen.apiKey;
    this.serverUrl = config.heygen.serverUrl;
  }

  async createSession(avatar_name, voice_id) {
    const response = await fetch(`${this.serverUrl}/v1/streaming.new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify({
        quality: config.heygen.defaultQuality,
        avatar_name,
        voice: { voice_id },
      }),
    });

    const data = await response.json();
    if (response.status === 500 || data.code === 10013) {
      throw new Error(data.message || 'Failed to create session');
    }
    return data.data;
  }

  async startSession(session_id, sdp) {
    const response = await fetch(`${this.serverUrl}/v1/streaming.start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify({ session_id, sdp }),
    });

    const data = await response.json();
    if (response.status === 500) {
      throw new Error('Failed to start session');
    }
    return data.data;
  }

  async handleICE(session_id, candidate) {
    const response = await fetch(`${this.serverUrl}/v1/streaming.ice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify({ session_id, candidate }),
    });

    const data = await response.json();
    if (response.status === 500) {
      throw new Error('Failed to handle ICE candidate');
    }
    return data;
  }

  async sendText(session_id, text) {
    const response = await fetch(`${this.serverUrl}/v1/streaming.task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify({ session_id, text }),
    });

    const data = await response.json();
    if (response.status === 500) {
      throw new Error('Failed to send text');
    }
    return data.data;
  }

  async stopSession(session_id) {
    const response = await fetch(`${this.serverUrl}/v1/streaming.stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify({ session_id }),
    });

    const data = await response.json();
    if (response.status === 500) {
      throw new Error('Failed to stop session');
    }
    return data.data;
  }
}

export const heygenService = new HeygenService();
