import { heygenService } from '../services/heygenService.js';
import { logger } from '../utils/logger.js';
import { persona } from '../utils/persona.js';

// Helper function to generate simple responses
const generateSimpleAIResponse = (userQuery = "") => {
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

export const initializeHeygenBot = async (req, res) => {
  try {
    logger.info('HeygenController', 'Initializing Heygen bot');
    
    // Generate a simple initialization response
    const initText = `Hello! I'm ${persona.name}. I've been initialized and ready to chat.`;
    
    logger.info('HeygenController', 'AI bot initialized successfully');
    
    res.json({
      success: true,
      message: 'Bot initialized successfully',
      data: {
        text: initText
      }
    });
  } catch (error) {
    logger.error('HeygenController', 'Bot initialization error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to initialize bot',
      error: error.message
    });
  }
};

export const createHeygenSession = async (req, res) => {
  try {
    const { avatar_name, voice_id } = req.body;
    
    if (!avatar_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: avatar_name'
      });
    }
    
    logger.info('HeygenController', 'Creating new Heygen session', { avatar_name, voice_id });
    const sessionInfo = await heygenService.createSession(avatar_name, voice_id);
    
    res.json({
      success: true,
      message: 'Session created successfully',
      data: sessionInfo
    });
  } catch (error) {
    logger.error('HeygenController', 'Session creation error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create session',
      error: error.message
    });
  }
};

export const handleICECandidate = async (req, res) => {
  try {
    const { session_id, candidate } = req.body;
    
    if (!session_id || !candidate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: session_id and candidate'
      });
    }
    
    logger.info('HeygenController', 'Handling ICE candidate', { session_id });
    const response = await heygenService.handleICE(session_id, candidate);
    
    res.json({
      success: true,
      message: 'ICE candidate handled successfully',
      data: response
    });
  } catch (error) {
    logger.error('HeygenController', 'ICE handling error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to handle ICE candidate',
      error: error.message
    });
  }
};

export const startHeygenSession = async (req, res) => {
  try {
    const { session_id, sdp } = req.body;
    
    if (!session_id || !sdp) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: session_id and sdp'
      });
    }
    
    logger.info('HeygenController', 'Starting Heygen session', { session_id });
    const response = await heygenService.startSession(session_id, sdp);
    
    res.json({
      success: true,
      message: 'Session started successfully',
      data: response
    });
  } catch (error) {
    logger.error('HeygenController', 'Session start error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to start session',
      error: error.message
    });
  }
};

export const sendHeygenText = async (req, res) => {
  try {
    const { session_id, text, generate_ai_response } = req.body;
    
    if (!session_id || !text) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: session_id and text'
      });
    }
    
    let finalText = text;
    
    // If AI response generation is requested, generate a simple response
    if (generate_ai_response) {
      logger.info('HeygenController', 'Generating AI response for user input', { text });
      finalText = generateSimpleAIResponse(text);
      logger.info('HeygenController', 'AI response generated', { aiResponse: finalText });
    }
    
    logger.info('HeygenController', 'Sending text to Heygen session', { session_id, text: finalText });
    const response = await heygenService.sendText(session_id, finalText);
    
    res.json({
      success: true,
      message: 'Text sent successfully',
      data: response,
      ai_response: generate_ai_response ? finalText : null
    });
  } catch (error) {
    logger.error('HeygenController', 'Send text error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to send text',
      error: error.message
    });
  }
};

export const stopHeygenSession = async (req, res) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: session_id'
      });
    }
    
    logger.info('HeygenController', 'Stopping Heygen session', { session_id });
    const response = await heygenService.stopSession(session_id);
    
    res.json({
      success: true,
      message: 'Session stopped successfully',
      data: response
    });
  } catch (error) {
    logger.error('HeygenController', 'Session stop error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to stop session',
      error: error.message
    });
  }
}; 