import { Router } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import {
  getMyConversations,
  createConversation,
  getMessages,
  sendMessage,
} from './conversation.controller.js';

const router = Router();

// All conversation routes require authentication
router.use(authenticateToken);

router.get('/', getMyConversations);
router.post('/', createConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);

export default router;
