import Role from '@/mysql/model/role.model';
import { queryConditionsData } from '@/service';
import { IUserInfoType, userType } from '@/types';
import { Op } from 'sequelize';
import { formatHumpLineTransfer } from '.';
import { getAllUserInfoSer, getUserRoleSer } from '../service/user';

export const getFullUserInfo = async (userId: number) => {
  const { password, ...res } = await getAllUserInfoSer({ userId });
  const roleIds = (await getUserRoleSer(userId)) as unknown as { role_id: number }[];
  const ids = roleIds.map((item) => item.role_id);

  res.roles = await queryConditionsData(Role, { role_id: { [Op.in]: ids } });
  const userInfo = formatHumpLineTransfer(res) as userType;

  const roles = [];
  const permissionsIds = [];
  const permissions = [];

  userInfo.roles.forEach((item) => {
    if (item.roleKey === 'admin') {
      permissions.push('*|*');
      roles.push('admin');
    } else {
      roles.push(item.roleKey);
      permissionsIds.push(item.roleId);
    }
  });

  return {
    userInfo,
    roles,
    permissions,
  } as IUserInfoType;
};
