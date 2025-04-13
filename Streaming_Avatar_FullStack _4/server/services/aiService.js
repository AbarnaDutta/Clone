import { logger } from '../utils/logger.js';
class AiService {
  constructor() {
    this.persona = '';
    this.personaConfig = null;
    logger.info('AiService', 'Service initialized');
  }

  async updatePersona() {
    logger.info('AiService', 'Updating persona configuration');
    try {
      const response = await fetch('http://localhost:3000/persona-config');
      if (!response.ok) {
        const error = 'Failed to fetch persona config';
        logger.error('AiService', error, { status: response.status });
        throw new Error(error);
      }

      this.personaConfig = await response.json();
      this.persona = this.generatePersonaPrompt(this.personaConfig);
      logger.info('AiService', 'Persona updated successfully', { name: this.personaConfig.name });
      return true;
    } catch (error) {
      logger.error('AiService', 'Failed to update persona', { error: error.message });
      return false;
    }
  }

  async initialize() {
    logger.info('AiService', 'Initializing AI service');
    try {
      await this.updatePersona();
      const response = await fetch('http://localhost:3000/openai/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: this.persona + `\nAct like ${this.personaConfig.name} always.`,
        }),
      });

      if (!response.ok) {
        const error = 'Failed to initialize AI';
        logger.error('AiService', error, { status: response.status });
        throw new Error(error);
      }
      logger.info('AiService', 'AI service initialized successfully');
      return true;
    } catch (error) {
      logger.error('AiService', 'AI initialization error', { error: error.message });
      return false;
    }
  }

  async getResponse(userInput) {
    logger.info('AiService', 'Getting AI response', { userInput });
    try {
      await this.updatePersona();
      const response = await fetch('http://localhost:3000/openai/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `${this.persona}\nUser: ${userInput}\n${this.personaConfig.name}:`,
        }),
      });

      if (!response.ok) {
        const error = 'Failed to get AI response';
        logger.error('AiService', error, { status: response.status });
        throw new Error(error);
      }

      const data = await response.json();
      logger.info('AiService', 'Got AI response successfully', {
        responseLength: data.text.length,
      });
      return data.text;
    } catch (error) {
      logger.error('AiService', 'AI response error', { error: error.message });
      throw error;
    }
  }
}

export const aiService = new AiService();
