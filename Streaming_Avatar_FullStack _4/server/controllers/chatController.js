import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { persona } from '../utils/persona.js';

// Create a simple AI response generator since Gemini API has issues
const generateResponse = (prompt) => {
  logger.info('AiService', 'Using simple response generator instead of Gemini API');
  
  // Extract any user query from the prompt
  let userQuery = '';
  if (prompt.includes('User:')) {
    userQuery = prompt.split('User:')[1].split('\n')[0].trim();
  }
  
  // Default responses based on query type
  if (!userQuery) {
    return `Hi there! I'm ${persona.name}, ${persona.title}. How can I help you today?`;
  }
  
  if (userQuery.toLowerCase().includes('who are you') || userQuery.toLowerCase().includes('introduce yourself')) {
    return `I'm ${persona.name}, a ${persona.education.year} student at ${persona.education.institution}, pursuing ${persona.education.degree}. I'm passionate about ${persona.personality.interests[0]} and ${persona.personality.interests[1]}.`;
  }
  
  if (userQuery.toLowerCase().includes('project') || userQuery.toLowerCase().includes('work')) {
    const projects = persona.technical.projects.slice(0, 2).join(' and ');
    return `I've worked on several projects including ${projects}. I'm comfortable with ${persona.technical.languages.join(', ')} for programming.`;
  }
  
  if (userQuery.toLowerCase().includes('goal') || userQuery.toLowerCase().includes('plan')) {
    return `Currently, I'm focused on ${persona.personality.goals[0]} and ${persona.personality.goals[1]}.`;
  }
  
  // Generic response for other queries
  return `Thanks for asking! As someone who's ${persona.traits[0]} and ${persona.traits[1]}, I'm always excited to talk about ${persona.personality.interests[Math.floor(Math.random() * persona.personality.interests.length)]}.`;
};

const generatePersonaPrompt = () => {
  const prompt = `
          From today your identity is ${persona.name}.
          You are ${persona.title}.
          Profile:
          Name: ${persona.name}
          Education: ${persona.education.degree} (${persona.education.year})
          Institution: ${persona.education.institution}
          Core Traits: ${persona.traits.join(', ')}

          Technical Identity:
          Languages Known: ${persona.technical.languages.join(', ')}
          Web Dev Stack: ${persona.technical.webStack.join(', ')}
          ${persona.technical.projects.length > 0 ? `Projects:\n${persona.technical.projects.join('\n')}` : ''}

          Personality & Style:
          ${persona.personality.style}
          Interests: ${persona.personality.interests.join(', ')}
          Current Goals: ${persona.personality.goals.join('\n')}

          Always reply like ${persona.name}'s real talking style, attitude, and tone.
          Keep responses concise and natural, like a real conversation.
      `;
  logger.debug('AiService', 'Generated prompt', { prompt });
  return prompt;
};

export const InitializeBot = async (req, res) => {
  logger.info('Server', 'Initializing AI service');
  try {
    const customPrompt = req.body.prompt || generatePersonaPrompt();
    const text = generateResponse(customPrompt);
    
    logger.info('Server', 'AI service initialized successfully', { responseLength: text.length });
    res.json({
      success: true,
      message: 'AI service initialized successfully',
      text,
    });
  } catch (error) {
    logger.error('Server', 'AI initialization error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error initializing AI service',
      error: error.message
    });
  }
};

export const AIChatResponse = async (req, res) => {
  logger.info('Server', 'Processing AI chat request');
  try {
    const userPrompt = req.body.prompt;
    const personaPrefix = req.body.includePersona !== false ? generatePersonaPrompt() + "\n\n" : "";
    const prompt = personaPrefix + userPrompt;
    
    logger.debug('Server', 'Generating content', { promptLength: prompt.length });

    const text = generateResponse(prompt);

    logger.info('Server', 'AI response generated successfully', { responseLength: text.length });
    res.json({
      success: true,
      message: 'AI response generated successfully',
      text,
    });
  } catch (error) {
    logger.error('Server', 'AI Error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error processing your request',
      error: error.message
    });
  }
};
