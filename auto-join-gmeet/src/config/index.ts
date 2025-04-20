// Configuration for the application
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: process.env.HOST || 'localhost'
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || 'AIzaSyBGjqg-0mjx6Aqc8UocIgxyq_vZqBvHsuQ',
    model: 'gemini-2.0-flash',
    config: {
        temperature: 0.9,
        topP: 0.1,
        topK: 16,
        maxOutputTokens: 2048,
        candidateCount: 1,
        stopSequences: []
},
  },
  meet: {
    defaultMeetingUrl: process.env.MEETING_URL || '',
    defaultUsername: process.env.USERNAME || 'Meeting Bot'
  },
  transcription: {
    language: 'en-US',
    interim: true
  },
  bot: {
    name: process.env.BOT_NAME || 'Soham',
    responseThreshold: process.env.RESPONSE_THRESHOLD ? parseFloat(process.env.RESPONSE_THRESHOLD) : 0.7,
    speakResponses: process.env.SPEAK_RESPONSES === 'true',
    nameVariations: function() {
      // Generate variations of the bot name for better detection
      const name = this.name.toLowerCase();
      const variations = [
        name,
        name + '?',
        'hey ' + name,
        'ok ' + name,
        'okay ' + name,
        'hi ' + name,
        'hello ' + name,
        name + ' bot',
        'mr ' + name,
        'mrs ' + name,
        'ms ' + name
      ];
      return variations;
    }
  }
}; 