import { persona } from '../utils/persona.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const personaFilePath = path.join(__dirname, '../utils/persona.js');

export const personaDetails = (req, res) => {
  logger.info('PersonaController', 'Fetching persona details');
  res.json(persona);
};

export const updatePersonaDetails = (req, res) => {
  logger.info('PersonaController', 'Updating persona details', req.body);
  
  try {
    const personaChanges = req.body;
    
    // Update persona details
    if (personaChanges.name) persona.name = personaChanges.name;
    if (personaChanges.title) persona.title = personaChanges.title;
    
    // Education
    if (personaChanges.education) {
      if (personaChanges.education.degree) persona.education.degree = personaChanges.education.degree;
      if (personaChanges.education.year) persona.education.year = personaChanges.education.year;
      if (personaChanges.education.institution) persona.education.institution = personaChanges.education.institution;
    }
    
    res.json({
      success: true,
      message: 'Persona details updated successfully',
      persona
    });
  } catch (error) {
    logger.error('PersonaController', 'Error updating persona details', error);
    res.status(500).json({
      success: false,
      message: 'Error updating persona details',
      error: error.message
    });
  }
};

export const getPersonaConfig = (req, res) => {
  logger.info('PersonaController', 'Fetching persona configuration');
  res.json(persona);
};

export const updatePersonaConfig = async (req, res) => {
  try {
    logger.info('PersonaController', 'Updating persona configuration');
    const newConfig = req.body;
    
    if (!newConfig) {
      return res.status(400).json({
        success: false,
        message: 'No configuration data provided'
      });
    }
    
    // Update the persona object
    if (newConfig.name) persona.name = newConfig.name;
    if (newConfig.title) persona.title = newConfig.title;
    
    // Update education
    if (newConfig.education) {
      if (newConfig.education.degree) persona.education.degree = newConfig.education.degree;
      if (newConfig.education.year) persona.education.year = newConfig.education.year;
      if (newConfig.education.institution) persona.education.institution = newConfig.education.institution;
    }
    
    // Update technical details
    if (newConfig.technical) {
      if (newConfig.technical.languages) persona.technical.languages = newConfig.technical.languages;
      if (newConfig.technical.webStack) persona.technical.webStack = newConfig.technical.webStack;
      if (newConfig.technical.projects) persona.technical.projects = newConfig.technical.projects;
    }
    
    // Update personality
    if (newConfig.personality) {
      if (newConfig.personality.style) persona.personality.style = newConfig.personality.style;
      if (newConfig.personality.interests) persona.personality.interests = newConfig.personality.interests;
      if (newConfig.personality.goals) persona.personality.goals = newConfig.personality.goals;
    }
    
    // Update traits
    if (newConfig.traits) persona.traits = newConfig.traits;
    
    // Optionally, save to file (for persistance)
    const personaCode = `export let persona = ${JSON.stringify(persona, null, 2)};`;
    fs.writeFileSync(personaFilePath, personaCode);
    
    res.json({
      success: true,
      message: 'Persona configuration updated successfully',
      data: persona
    });
  } catch (error) {
    logger.error('PersonaController', 'Error updating persona configuration', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error updating persona configuration',
      error: error.message
    });
  }
};
