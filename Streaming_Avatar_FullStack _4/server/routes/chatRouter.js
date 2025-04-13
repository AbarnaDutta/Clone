import { Router } from 'express';
import { AIChatResponse, InitializeBot } from '../controllers/chatController.js';
const chatRouter = Router();

chatRouter.post('/complete', AIChatResponse);
chatRouter.post('/', InitializeBot);
export default chatRouter;
