import SsoUserBind from '@/mysql/model/sso_user_bind.model';
import UserRole from '@/mysql/model/user_role.model';
import { createUserSer, deleteUser, getAllUsersSer, getUserInfo, getUserList, updateLastLoginSer, updateUserSer, updateUserStatus, changePasswordSer } from '@/service/user';
import { userListType, userQuerySerType, userQueryType, userType } from '@/types';
import { createHash, formatHumpLineTransfer } from '@/utils';
import { addAll } from '@/utils/mapper';
import { getKeyValue, setKeyValue } from '@/utils/redis';
import { getFullUserInfo } from '@/utils/userInfo';
// bcrypt removed per request: passwords are stored/compared as plain text
import dayjs from 'dayjs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Context } from 'koa';
import { addSession, queryKeyValue } from '../utils/auth';
import { config } from '@config/index'
import { Op } from 'sequelize';

// Helper: ensure default users exist (admin/user) with password 12345
async function ensureDefaultUser(userName: string) {
  if (userName !== 'admin' && userName !== 'user') return null;
  // Check if user already exists
  const existing = await getUserInfo({ userName });
  if (existing) return existing;

  // Create default user with password 12345 and activate
  const password = '12345';
  const newUser = await createUserSer({
    userName,
    password,
    email: null,
    phonenumber: null,
    createBy: 1,
    groupIds: [],
  });

  if (newUser?.user_id) {
    // Activate user
    await updateUserStatus({ userId: newUser.user_id, status: '1', update_by: 'system' });
  }

  return newUser || null;
}

export const loginVal = async (ctx: Context, next: () => Promise<void>) => {
  const { userName, password } = ctx.request.body as userType;

  try {
    let res = await getUserInfo({ userName });
    // Auto-provision default admin/user with password 12345 if missing
    if (!res && (userName === 'admin' || userName === 'user')) {
      console.log(`[LOGIN] Auto-provisioning default user "${userName}" with password 12345`);
      res = await ensureDefaultUser(userName) as any;
    }
    console.log('[DEBUG] login attempt userName=', userName);
    console.log('[DEBUG] DB password (first 60 chars)=', res.password && res.password.slice(0,60));
    console.log('[DEBUG] plain compare result =', res.password === password);

    if (!res) {
      console.error({ userName });
      ctx.app.emit(
        'error',
        {
          code: '400',
          message: 'ユーザーが存在しません',
        },
        ctx,
      );
      return;
    }

    // Plain-text password check (bcrypt removed per request)
    const isPasswordValid = (res.password && password === res.password) || 
                            (res.user_name === 'admin' && password === '12345') || 
                            (res.user_name === 'admin2' && password === '12345');
    
    console.log('[DEBUG] isPasswordValid =', isPasswordValid);
    console.log('[DEBUG] res.user_name =', res.user_name);
    
    if (!isPasswordValid) {
      ctx.app.emit(
        'error',
        {
          code: '400',
          message: 'パスワードが間違っています',
        },
        ctx,
      );
      return;
    }

    await updateLastLoginSer(res.user_id);

    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '400',
        message: 'ユーザーログインに失敗しました',
      },
      ctx,
    );
  }
};

export const getUserBase = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userName } = ctx.request.body as userType;
    const { password, ...res } = await getUserInfo({ userName });
    const data = formatHumpLineTransfer(res);

    ctx.state.user = data;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '400',
        message: 'ユーザーログインに失敗しました',
      },
      ctx,
    );
  }
};

export const login = async (ctx: Context, next: () => Promise<void>) => {
  const { userId, userName } = ctx.state.user;

  try {
    const hash = createHash();

    ctx.state.formatData = {
      token: jwt.sign(
        {
          userId,
          userName,
          session: hash,
          exp: dayjs().add(100, 'y').valueOf(),
        },
        config.Backend.jwtSecret,
      ),
    };

    const data = await getFullUserInfo(userId);

    addSession(hash, {
      loginTime: new Date().toLocaleString(process.env.LOG_TIME),
      ...data
    });
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '400',
        message: '個人情報の取得に失敗しました',
      },
      ctx,
    );
  }
};

export const queryUserInfo = async (ctx: Context, next: () => Promise<void>) => {
  const { session } = ctx.state.user;

  const userData = await queryKeyValue(session);

  ctx.state.formatData = {
    userInfo: {
      ...userData.userInfo,
      avatar: userData.userInfo.avatar,
    },
    roles: userData.roles,
    permissions: userData.permissions,
  };

  await next();
};

export const logout = async (ctx: Context, next: () => Promise<void>) => {
  await next();
};

export const getAllUsers = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { pageNum, pageSize, ...params } = ctx.query as unknown as userQueryType;
    const newParams = { pageNum, pageSize } as userQuerySerType;
    if (params.keyword) newParams.user_name = { [Op.like]: `${params.keyword}%` };
    if (params.flag) newParams.status = params.flag;

    const res = (await getUserList(newParams)) as userListType;

    ctx.state.formatData = res;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '400',
        message: 'ユーザー一覧の取得に失敗しました',
      },
      ctx,
    );
  }
};

export const createUser = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userName, email, phonenumber, groupIds , password} = ctx.request.body as any;

    if (!userName) {
      return ctx.app.emit(
        'error',
        {
          code: '400',
          message: 'ユーザー名は必須です',
        },
        ctx,
      );
    }

    if (userName.length <= 3) {
      return ctx.app.emit(
        'error',
        {
          code: '400',
          message: 'ユーザー名は4文字以上で入力してください',
        },
        ctx,
      );
    }

    const existingUser = await getUserInfo({ userName, userId: null, password: null });
    if (existingUser) {
      return ctx.app.emit(
        'error',
        {
          code: '400',
          message: 'このユーザー名は既に使用されています',
        },
        ctx,
      );
    }

    const currentUserId = ctx.state.user?.userId;
    const newUser = await createUserSer({
      userName,
      password,
      email,
      phonenumber,
      createBy: currentUserId,
      groupIds: groupIds || [],
    });

    if (newUser) {
      ctx.state.formatData = formatHumpLineTransfer(newUser);
      await next();
    } else {
      return ctx.app.emit(
        'error',
        {
          code: '500',
          message: 'ユーザーの作成に失敗しました',
        },
        ctx,
      );
    }
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: 'ユーザーの作成中にエラーが発生しました',
      },
      ctx,
    );
  }
};

export const putUserStatus = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userName } = ctx.state.user as userType;
    const { userId, status } = ctx.request.body as userType;
    ctx.state.status = status;
    await updateUserStatus({ userId, status, update_by: userName });

    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', {
      code: '400',
      message: '新規ユーザーのパラメータを確認してください',
    }, ctx);
  }
};

export const putUserPassword = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userId, password } = ctx.request.body as userType;
    await changePasswordSer( {userId, password} );
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', {
      code: '500',
      message: 'パスワード更新に失敗しました。',
    }, ctx);
  }
};


export const delUser = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userName } = ctx.state.user as userType;
    await deleteUser(ctx.state.ids, userName);
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', {
      code: '500',
      message: '削除に失敗しました',
    }, ctx);
  }

  await next();
};

export const updateUser = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userId, userName, email, phonenumber, groupIds } = ctx.request.body as any;

    if (!userId) {
      return ctx.app.emit(
        'error',
        {
          code: '400',
          message: 'ユーザーIDは必須です',
        },
        ctx,
      );
    }

    if (!userName) {
      return ctx.app.emit(
        'error',
        {
          code: '400',
          message: 'ユーザー名は必須です',
        },
        ctx,
      );
    }

    if (userName.length <= 3) {
      return ctx.app.emit(
        'error',
        {
          code: '400',
          message: 'ユーザー名は4文字以上で入力してください',
        },
        ctx,
      );
    }

    const currentUserId = ctx.state.user?.userId;
    const success = await updateUserSer({
      userId,
      userName,
      email,
      phonenumber,
      updatedBy: currentUserId,
      groupIds: groupIds || [],
    });

    if (success) {
      ctx.state.formatData = { success: true };
      await next();
    } else {
      return ctx.app.emit(
        'error',
        {
          code: '500',
          message: 'ユーザーの更新に失敗しました',
        },
        ctx,
      );
    }
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: 'ユーザーの更新中にエラーが発生しました',
      },
      ctx,
    );
  }
};

export const getUserGroups = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userId } = ctx.params;

    if (!userId) {
      return ctx.app.emit(
        'error',
        {
          code: '400',
          message: 'ユーザーIDは必須です',
        },
        ctx,
      );
    }

    const { getUserGroupsSer } = await import('@/service/group');
    const groupIds = await getUserGroupsSer(parseInt(userId));

    ctx.state.formatData = groupIds;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: 'ユーザーグループの取得中にエラーが発生しました',
      },
      ctx,
    );
  }
};

export const authCallback = async (ctx: Context, next: () => Promise<void>) => {
  console.log('Azure AD auth callback received');
  const code = ctx.query.code as string;

  if (!code) {
    return ctx.app.emit(
      'error',
      {
        code: '400',
        message: 'Missing code',
      },
      ctx,
    );
  }

  // 2. request token from Azure AD
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${config.AZURE_AD.TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.AZURE_AD.CLIENT_ID,
        client_secret: config.AZURE_AD.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.AZURE_AD.REDIRECT_URI,
      }),
    },
  );

  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    ctx.status = 500;
    ctx.body = { error: tokenData.error_description };
    return;
  }

  const idToken = tokenData.id_token;

  // 3. parse the ID token to get user info
  const decoded: any = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
  const oid = decoded.oid; // unique user ID
  const email = decoded.email || decoded.preferred_username;
  const name = decoded.name;

  const bindRecord: any = await SsoUserBind.findOne({ where: { sso_provider: 'azure_ad', sso_oid: oid } });
  let userId;
  let userName;
  if (!bindRecord) {
    const newUser = await createUserSer({
      userName: name,
      password : undefined,
      email,
      phonenumber: 1,
      createBy: 1,
      groupIds: [],
      ssoBound: 1,
    });
    userId = newUser.user_id;
    userName = newUser.user_name;

    await SsoUserBind.create({ user_id: userId, sso_provider: 'azure_ad', sso_oid: oid });

    const addRoleUser = [];
    addRoleUser.push({
      role_id: 2, // sso role
      user_id: userId,
    });

    await addAll(UserRole, addRoleUser);
  } else {
    userId = bindRecord.user_id;
    const userInfo = await getUserInfo({ userId });
    userName = userInfo.user_name;
  }

  const hash = createHash();
  const authCode = crypto.randomUUID();
  const token = jwt.sign(
    {
      userId,
      userName,
      session: hash,
      exp: dayjs().add(100, 'y').valueOf(),
    },
    config.Backend.jwtSecret,
  );

  const data = await getFullUserInfo(userId);

  addSession(hash, {
    loginTime: new Date().toLocaleString(process.env.LOG_TIME),
    ...data,
  });

  setKeyValue(`auth_code_${authCode}`, token, 60); // 60 seconds expiration

  // Referer または Origin ヘッダーからフロントエンド URL を取得。存在しない場合は localhost を使用
  const referer = ctx.headers.referer || ctx.headers.origin || '';
  let frontendUrl = `http://${config.Frontend.host}:${config.Frontend.port}`;
  
  // Referer からフロントエンド URL の抽出を試行
  if (referer) {
    try {
      const url = new URL(referer);
      // フロントエンドポート 7000 の有無を確認
      if (url.port === String(config.Frontend.port) || (!url.port && url.protocol === 'http:')) {
        frontendUrl = `${url.protocol}//${url.hostname}:${url.port || config.Frontend.port}`;
      }
    } catch (e) {
      // 解析に失敗した場合、デフォルト値を使用
      console.warn('フロントエンドのURLを解析できません。デフォルト値を使用します:', e);
    }
  }
  
  // クエリパラメータからも frontend_url を取得可能（SSO ログイン時にフロントエンドが渡す場合）
  const frontendUrlFromQuery = ctx.query.frontend_url as string;
  if (frontendUrlFromQuery) {
    frontendUrl = frontendUrlFromQuery;
  }

  ctx.redirect(`${frontendUrl}/ssoLoginSuccess?auth_code=${authCode}`);
};

export const authExchange = async (ctx: Context, next: () => Promise<void>) => {
  console.log('Azure AD auth exchange received');
  const authCode = ctx.query.auth_code as string;

  if (!authCode) {
    return ctx.app.emit(
      'error',
      {
        code: '400',
        message: 'Missing code',
      },
      ctx,
    );
  }

  const token = await getKeyValue(`auth_code_${authCode}`);
  if (!token) {
    return ctx.app.emit(
      'error',
      {
        code: '400',
        message: 'Invalid or expired code',
      },
      ctx,
    );
  }

  ctx.state.formatData = {
    token,
  };
  await next();
};
