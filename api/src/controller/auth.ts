import { IuserTokenType } from '@/types';
import { addSession, judgeKeyOverdue, queryKeyValue, removeListKey, resetTime } from '@/utils/auth';
import { getSetsValue, removeSetKeys } from '@/utils/redis';
import { getFullUserInfo } from '@/utils/userInfo';
import jwt from 'jsonwebtoken';
import { Context } from 'koa';
import { config } from '@config/index'

export const authWhites = [
  '/user/login',
  '/user/logout',
  '/user/register',
  '/user/captchaImage',
  '/system/config/configKey',
  'system/menu/list',
  '/group/list',
  '/group/populate-test-data',
  '/api/files/extract-text',
  '/api/gen-task',  // Allow chat endpoint for testing
  '/user/auth/callback',
  '/user/auth/exchange',
  // Support and messaging endpoints
  '/api/support/ticket',
  '/api/support/notifications',
  '/api/support/notifications/count',
  '/api/messages/send',
  '/api/messages/broadcast',
  '/api/messages/inbox',
  '/api/messages/unread-count',
];

export const auth = async (ctx: Context, next: () => Promise<void>) => {
  const { authorization = '' } = ctx.request.header;
  const token = authorization.replace('Bearer ', '');

  const uri = ctx.request.url.split('?')[0];

  if (!authWhites.includes(uri)) {
    // TODO: Not all of the config values is using the new config management system
    //       We need refactor the whole project to use the new config management system
    try {
      const user = jwt.verify(token, config.Backend.jwtSecret) as IuserTokenType;

      if (!(await judgeKeyOverdue(user.session))) {
        removeListKey([user.session]);
        console.error('token expired');
        return ctx.app.emit(
          'error',
          {
            code: '401',
            message: '無効なトークン',
          },
          ctx,
        );
      }

      resetTime(user.session);

      if ((await getSetsValue('update_userInfo')).includes(String(user.userId))) {
        const userData = await queryKeyValue(user.session);

        const data = await getFullUserInfo(user.userId);

        await addSession(user.session, {
          ...userData,
          loginTime: new Date().toLocaleString(config.Backend.logTime),
          ...data
        });

        removeSetKeys('update_userInfo', [String(user.userId)]);
      }

      ctx.state.user = user;
    } catch (error) {
      console.error('Auth error:', error);
      return ctx.app.emit(
        'error',
        {
          code: '401',
          message: '無効なトークン',
        },
        ctx,
      );
    }
  } else {
    // For whitelisted endpoints, try to use token if provided
    if (token) {
      try {
        const user = jwt.verify(token, config.Backend.jwtSecret) as IuserTokenType;
        ctx.state.user = user;
      } catch {
        // Token invalid, use test user
        ctx.state.user = {
          userId: 1,
          userName: 'test_user',
          session: 'test_session',
          permissions: ['*|*'],
        } as any;
      }
    } else {
      // No token provided, use test user
      ctx.state.user = {
        userId: 1,
        userName: 'test_user',
        session: 'test_session',
        permissions: ['*|*'],
      } as any;
    }
  }

  await next();
};

export const usePermission = (permission: string) => async (ctx: Context, next: () => Promise<void>) => {
  const { session } = ctx.state.user;

  const { permissions } = await queryKeyValue(session);

  if (permissions[0] !== '*|*') {
    const type = ctx.request.method === 'POST' ? ctx.request.body.type : ctx.query.type;
    if (type) {
      if (!permissions.includes(`${permission}|${type}`)) {
        return ctx.app.emit(
          'error',
          {
            code: '403',
            message: 'アクセス権限がありません',
          },
          ctx,
        );
      }
    } else if (!permissions.includes(permission)) {
      return ctx.app.emit(
        'error',
        {
          code: '403',
          message: 'アクセス権限がありません',
        },
        ctx,
      );
    }
  }

  await next();
};
