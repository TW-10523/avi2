import seq from './seq.db';
import dayjs from 'dayjs';
import { initNotification } from '../model/notification.model';
import { initSupportTicket } from '../model/support_ticket.model';

const initDB = () =>
  new Promise(() => {
    try {
      seq.authenticate();
      console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 🚀 データベース接続が成功しました`);
      
      // Initialize models
      initNotification(seq);
      initSupportTicket(seq);
      
      seq.sync();
    } catch (error) {
      console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] データベース接続に失敗しました`, error);
    }

    process.on('unhandledRejection', (error) => {
      console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] データベース接続に失敗しました`, error);
    });
  });

export default initDB;
