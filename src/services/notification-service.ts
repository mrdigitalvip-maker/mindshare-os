import { readMockDatabase } from "./local-store";

export const NotificationService = {
  async list() {
    return readMockDatabase().notifications;
  },
};
