import { Router } from 'express';
import { personaDetails, updatePersonaDetails, getPersonaConfig, updatePersonaConfig } from '../controllers/personaController.js';
import { initializeHeygenBot, createHeygenSession, startHeygenSession, sendHeygenText, stopHeygenSession, handleICECandidate } from '../controllers/heygenController.js';

const personaRouter = Router();

personaRouter.get('/', personaDetails);
personaRouter.post('/', updatePersonaDetails);
personaRouter.get('/config', getPersonaConfig);
personaRouter.post('/update', updatePersonaConfig);
personaRouter.post('/heygen/init', initializeHeygenBot);
personaRouter.post('/heygen/session/create', createHeygenSession);
personaRouter.post('/heygen/session/start', startHeygenSession);
personaRouter.post('/heygen/ice', handleICECandidate);
personaRouter.post('/heygen/text', sendHeygenText);
personaRouter.post('/heygen/session/stop', stopHeygenSession);

export default personaRouter;
