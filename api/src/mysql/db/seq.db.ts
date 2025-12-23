import { Sequelize } from 'sequelize';
import { config } from '@/config';

const seq = new Sequelize(config.MySQL.database, config.MySQL.user, config.MySQL.password, {
  host: config.MySQL.host,
  port: config.MySQL.port,
  dialect: 'mysql',
  timezone: '+09:00',
  logging: false,
  define: {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  },
  dialectOptions: {
    dateStrings: true,
    typeCast: (field, next) => {
      // for reading from database
      if (field.type === 'DATETIME') {
        return field.string();
      }
      return next();
    },
  },
  pool: {
    max: 50,
    min: 0,
    idle: 10000,
  },
});

export default seq;
