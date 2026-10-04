export type Notification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

export const defaultNotifications: Notification[] = [];
