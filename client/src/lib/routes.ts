import { UserRole, type UserRoleType } from '@shared/schema';

export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  PROFILE: '/profile',
  DASHBOARD: {
    [UserRole.CUSTOMER]: '/dashboard/customer',
    [UserRole.SUPPORT]: '/dashboard/support',
    [UserRole.ADMIN]: '/dashboard/admin',
  }
} as const;

export const getDashboardRoute = (role: UserRoleType) => {
  return ROUTES.DASHBOARD[role];
};
