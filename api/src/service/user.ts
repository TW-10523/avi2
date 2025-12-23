import User from '@/mysql/model/user.model';
import UserRole from '@/mysql/model/user_role.model';
import { userQuerySerType, userType } from '@/types';
import { Op } from 'sequelize';

export const getUserInfo = async ({ userId, userName, password }: userType) => {
  const whereOpt = {};
  if (userId) Object.assign(whereOpt, { user_id: userId });
  if (userName) Object.assign(whereOpt, { user_name: userName, deleted_at: null });
  if (password) Object.assign(whereOpt, { password });

  const res = (await User.findOne({
    attributes: ['user_id', 'user_name', 'password'],
    where: whereOpt,
  })) as any;

  return res ? res.dataValues : null;
};

export const getAllUserInfoSer = async ({ userId }) => {
  const res = (await User.findOne({
    where: { user_id: userId },
  })) as any;

  return res ? res.dataValues : null;
};

export const getUserList = async (queryParams: userQuerySerType) => {
  const { pageNum, pageSize, beginTime, endTime, ...params } = queryParams;
  if (beginTime) {
    params.created_at = { [Op.between]: [beginTime, endTime] };
  }

  const res = await User.findAndCountAll({
    attributes: ['user_id', 'user_name', 'email', 'phonenumber', 'status', 'created_at', 'last_login_at'],
    offset: (Number(pageNum) - 1) * Number(pageSize),
    limit: Number(pageSize),
    where: {
      deleted_at: null,
      ...params,
    },
  });

  const list = {
    count: res.count,
    rows: res.rows || {},
  };
  return list;
};

export const deleteUser = async (userId, deleteBy) => {
  const res = await User.update({ deleted_at: new Date(), delete_by: deleteBy }, { where: { user_id: userId } });

  return res || null;
};

export const updateUserStatus = async (user) => {
  const { userId, ...data } = user;
  const res = await User.update(data, { where: { user_id: userId } });

  return res[0] > 0;
};

export const getAllUsersSer = async () => {
  const res = await User.findAll({
    attributes: ['user_id', 'user_name', 'email', 'phonenumber', 'status', 'created_at', 'last_login_at'],
    where: { deleted_at: null, sso_bound: 0 },
    order: [['created_at', 'DESC']]
  }) as any;

  return res ? res.map(user => user.dataValues) : [];
};

export const createUserSer = async ({ userName, password,  email, phonenumber, createBy, groupIds = [], ssoBound = 0 }) => {
  if(password === undefined) {
    password = userName;
    if (password.length <= 3) {
      password = password.padStart(4, '0');
    }
  }

  // Store password as plain text (per request)
  const userData = {
    user_name: userName,
    password: password,
    email: email || null,
    phonenumber: phonenumber || null,
    sso_bound: ssoBound,
    status: '0', // デフォルトで無効
    create_by: createBy || null
  };

  const res = await User.create(userData) as any;

  if (res && groupIds.length > 0) {
    const { createUserGroupRelations } = await import('./group');
    await createUserGroupRelations(res.dataValues.user_id, groupIds);
  }

  return res ? res.dataValues : null;
};

export const updateLastLoginSer = async (userId: number) => {
  const res = await User.update(
    { last_login_at: new Date() },
    { where: { user_id: userId } }
  );
  return res[0] > 0;
};

export const updateUserSer = async ({ userId, userName, email, phonenumber, updatedBy, groupIds = [] }) => {
  const userData = {
    user_name: userName,
    email: email || null,
    phonenumber: phonenumber || null,
    updated_by: updatedBy || null,
    updated_at: new Date()
  };

  const res = await User.update(userData, {
    where: { user_id: userId, deleted_at: null }
  });

  if (res[0] > 0 && groupIds.length >= 0) {
    const { updateUserGroupRelations } = await import('./group');
    await updateUserGroupRelations(userId, groupIds);
  }

  return res[0] > 0;
};

export const getUserRoleSer = async (userId) => {
  const res = await UserRole.findAll({
    raw: true,
    attributes: ['role_id'],
    where: { user_id: userId },
  });
  return res || [];
};

export const changePasswordSer = async ( {userId, password} ) => {
  // Store password as plain text (per request)
  const userData = {
    password: password,
  };

  const res = await User.update(userData, {
    where: { user_id: userId, deleted_at: null }
  });

  return res[0] > 0;
};