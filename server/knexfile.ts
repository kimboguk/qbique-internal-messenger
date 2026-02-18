import type { Knex } from 'knex';
import { config } from './src/config';

const knexConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: config.db.password
      ? {
          host: config.db.host,
          port: config.db.port,
          database: config.db.name,
          user: config.db.user,
          password: config.db.password,
        }
      : {
          host: '/var/run/postgresql',
          database: config.db.name,
        },
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },

  production: {
    client: 'pg',
    connection: {
      host: '100.99.64.32',
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
    },
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default knexConfig;
module.exports = knexConfig;
