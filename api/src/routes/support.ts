/**
 * Support Ticket Routes
 * Handles user support queries and admin responses
 */
import Joi from 'joi';
import Router from 'koa-router';
import {
  createSupportTicket,
  replyToTicket,
  listSupportTickets,
  getUserNotifications,
  markNotificationRead,
  getUnreadCount,
} from '@/service/supportTicketService';

const router = new Router({ prefix: '/api/support' });

// Create a support ticket (user)
router.post('/ticket', async (ctx: any) => {
  const schema = Joi.object({
    subject: Joi.string().required().max(255),
    message: Joi.string().required(),
  });

  const { error, value } = schema.validate(ctx.request.body);
  if (error) {
    ctx.body = { code: 400, message: error.details[0].message };
    return;
  }

  try {
    const user = ctx.state.user || { userId: 1, userName: 'test' };
    const result = await createSupportTicket({
      userId: user.userId,
      userName: user.userName,
      subject: value.subject,
      message: value.message,
    });

    ctx.body = { code: 200, message: 'Ticket created successfully', result };
  } catch (err: any) {
    ctx.body = { code: 500, message: err.message || 'Failed to create ticket' };
  }
});

// List tickets (user sees own, admin sees all)
router.get('/tickets', async (ctx: any) => {
  const { pageNum = 1, pageSize = 20, status } = ctx.query;
  const user = ctx.state.user || { userId: 1, role: 'user' };

  try {
    const isAdmin = user.role === 'admin' || user.isAdmin;
    
    const result = await listSupportTickets({
      pageNum: Number(pageNum),
      pageSize: Number(pageSize),
      userId: isAdmin ? undefined : user.userId,
      status: status as string,
    });

    ctx.body = { code: 200, message: 'Success', result };
  } catch (err: any) {
    ctx.body = { code: 500, message: err.message || 'Failed to list tickets' };
  }
});

// Admin reply to ticket
router.post('/ticket/:ticketId/reply', async (ctx: any) => {
  const schema = Joi.object({
    reply: Joi.string().required(),
    status: Joi.string().valid('in_progress', 'resolved', 'closed').optional(),
  });

  const { error, value } = schema.validate(ctx.request.body);
  if (error) {
    ctx.body = { code: 400, message: error.details[0].message };
    return;
  }

  try {
    const user = ctx.state.user || { userId: 1, userName: 'admin' };
    const ticketId = Number(ctx.params.ticketId);

    const result = await replyToTicket({
      ticketId,
      adminId: user.userId,
      adminName: user.userName,
      reply: value.reply,
      status: value.status,
    });

    ctx.body = { code: 200, message: 'Reply sent successfully', result };
  } catch (err: any) {
    ctx.body = { code: 500, message: err.message || 'Failed to reply' };
  }
});

// Get user notifications
router.get('/notifications', async (ctx: any) => {
  const { unreadOnly } = ctx.query;
  const user = ctx.state.user || { userId: 1 };

  try {
    const notifications = await getUserNotifications(
      user.userId,
      unreadOnly === 'true'
    );

    ctx.body = { code: 200, message: 'Success', result: notifications };
  } catch (err: any) {
    ctx.body = { code: 500, message: err.message || 'Failed to get notifications' };
  }
});

// Get unread notification count
router.get('/notifications/count', async (ctx: any) => {
  const user = ctx.state.user || { userId: 1 };

  try {
    const count = await getUnreadCount(user.userId);
    ctx.body = { code: 200, message: 'Success', result: { count } };
  } catch (err: any) {
    ctx.body = { code: 500, message: err.message || 'Failed to get count' };
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (ctx: any) => {
  const user = ctx.state.user || { userId: 1 };
  const notificationId = Number(ctx.params.notificationId);

  try {
    await markNotificationRead(notificationId, user.userId);
    ctx.body = { code: 200, message: 'Marked as read' };
  } catch (err: any) {
    ctx.body = { code: 500, message: err.message || 'Failed to mark as read' };
  }
});

export default router;
