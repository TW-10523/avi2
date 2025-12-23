/**
 * Messages API Routes - User-Admin Communication
 */
import Router from 'koa-router';
import Message from '@/mysql/model/message.model';
import { Op } from 'sequelize';

const router = new Router({ prefix: '/api/messages' });

const getCurrentUser = (ctx: any) => {
  return ctx.state?.user || { userName: 'anonymous' };
};

// POST /send - Send message
router.post('/send', async (ctx: any) => {
  try {
    const user = getCurrentUser(ctx);
    const { subject, content, recipientId, parentId } = ctx.request.body;

    if (!subject || !content) {
      ctx.body = { code: 400, message: 'Subject and content required' };
      return;
    }

    const isAdmin = user.userName === 'admin';
    const message = await Message.create({
      sender_id: user.userName,
      sender_type: isAdmin ? 'admin' : 'user',
      recipient_id: isAdmin ? recipientId : 'admin',
      recipient_type: isAdmin ? 'user' : 'admin',
      subject,
      content,
      parent_id: parentId || null,
      is_read: false,
      is_broadcast: false,
    });

    ctx.body = { code: 200, message: 'Message sent successfully', result: { id: message.id } };
  } catch (err) {
    ctx.body = { code: 500, message: 'Failed to send message' };
  }
});

// POST /broadcast - Admin broadcast to all
router.post('/broadcast', async (ctx: any) => {
  try {
    const user = getCurrentUser(ctx);
    if (user.userName !== 'admin') {
      ctx.body = { code: 403, message: 'Admin only' };
      return;
    }

    const { subject, content } = ctx.request.body;
    const message = await Message.create({
      sender_id: 'admin',
      sender_type: 'admin',
      recipient_id: 'all',
      recipient_type: 'all',
      subject,
      content,
      is_broadcast: true,
    });

    ctx.body = { code: 200, message: 'Broadcast sent', result: { id: message.id } };
  } catch (err) {
    ctx.body = { code: 500, message: 'Failed to broadcast' };
  }
});

// GET /inbox - Get messages for user
router.get('/inbox', async (ctx: any) => {
  try {
    const user = getCurrentUser(ctx);
    const isAdmin = user.userName === 'admin';

    let where;
    if (isAdmin) {
      // Admin sees all user queries sent to admin
      where = { recipient_type: 'admin', sender_type: 'user' };
    } else {
      // Users see: direct replies from admin + broadcasts
      // Since whitelisted users get test_user, show all admin->user messages
      where = {
        [Op.or]: [
          { recipient_id: user.userName, sender_type: 'admin' },
          { recipient_type: 'user', sender_type: 'admin' }, // All admin replies
          { is_broadcast: true },
        ],
      };
    }

    const messages = await Message.findAll({ where, order: [['created_at', 'DESC']], limit: 50 });
    const unreadCount = await Message.count({ where: { ...where, is_read: false } });

    ctx.body = { code: 200, result: { messages, unreadCount } };
  } catch (err) {
    console.error('[Messages] Inbox error:', err);
    ctx.body = { code: 500, message: 'Failed to fetch messages' };
  }
});

// GET /unread-count
router.get('/unread-count', async (ctx: any) => {
  try {
    const user = getCurrentUser(ctx);
    const isAdmin = user.userName === 'admin';

    let where;
    if (isAdmin) {
      where = { recipient_type: 'admin', sender_type: 'user', is_read: false };
    } else {
      where = {
        is_read: false,
        [Op.or]: [
          { recipient_id: user.userName, sender_type: 'admin' },
          { recipient_type: 'user', sender_type: 'admin' }, // All admin replies
          { is_broadcast: true },
        ],
      };
    }

    const count = await Message.count({ where });
    ctx.body = { code: 200, result: { count } };
  } catch (err) {
    ctx.body = { code: 500, result: { count: 0 } };
  }
});

// PUT /mark-read/:id
router.put('/mark-read/:id', async (ctx: any) => {
  try {
    const { id } = ctx.params;
    await Message.update({ is_read: true }, { where: { id } });
    ctx.body = { code: 200, message: 'Marked as read' };
  } catch (err) {
    ctx.body = { code: 500, message: 'Failed' };
  }
});

// PUT /mark-all-read
router.put('/mark-all-read', async (ctx: any) => {
  try {
    const user = getCurrentUser(ctx);
    const isAdmin = user.userName === 'admin';

    let where;
    if (isAdmin) {
      where = { recipient_type: 'admin' };
    } else {
      where = { [Op.or]: [{ recipient_id: user.userName }, { is_broadcast: true }] };
    }

    await Message.update({ is_read: true }, { where });
    ctx.body = { code: 200, message: 'All marked as read' };
  } catch (err) {
    ctx.body = { code: 500, message: 'Failed' };
  }
});

export default router;
