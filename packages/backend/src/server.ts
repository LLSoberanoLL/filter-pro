import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import dotenv from 'dotenv';

import { connectDb } from './models';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import filterRoutes from './routes/filters';
import dsRoutes from './routes/datasources';
import genRoutes from './routes/generateQuery';

dotenv.config();

const fastify = Fastify({ 
  logger: { 
    level: process.env.LOG_LEVEL || 'info' 
  } 
});

// Swagger/OpenAPI configuration
fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'FilterPro API',
      description: 'API completa do sistema FilterPro - Gerenciamento de filtros dinâmicos com Web Component',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Endpoints de autenticação' },
      { name: 'Projects', description: 'Gerenciamento de projetos' },
      { name: 'Filters', description: 'Gerenciamento de filtros' },
      { name: 'Datasources', description: 'Gerenciamento de datasources' },
      { name: 'Query', description: 'Gerador de queries MongoDB' },
    ],
  },
});

// Enable CORS for all origins - MUST be before other routes
fastify.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Credentials', 'true');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  reply.header('Access-Control-Allow-Headers', '*');
});

fastify.addHook('preHandler', async (request, reply) => {
  if (request.method === 'OPTIONS') {
    reply.status(200).send();
  }
});

fastify.register(fastifyJwt, { secret: process.env.JWT_SECRET || 'supersecret' });

fastify.register(async function (instance) {
  instance.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
});

// register routes
fastify.register(authRoutes);
fastify.register(projectRoutes);
fastify.register(filterRoutes);
fastify.register(dsRoutes);
fastify.register(genRoutes);

// Mock routes
import mockCitiesRoutes from './routes/mock-cities';
fastify.register(mockCitiesRoutes);

import mockCountriesRoutes from './routes/mock-countries';
fastify.register(mockCountriesRoutes);

// Datasource routes
import datasourceOptionsRoutes from './routes/datasource-options';
fastify.register(datasourceOptionsRoutes);

import datasourceSyncRoutes from './routes/datasource-sync';
fastify.register(datasourceSyncRoutes);

// Filter options with dependency resolution
import filterOptionsRoutes from './routes/filter-options';
fastify.register(filterOptionsRoutes);

// Admin routes
import adminRoutes from './routes/admin';
fastify.register(adminRoutes);

// Scalar API Documentation - Serve HTML page with Scalar via CDN
fastify.get('/documentation', async (request, reply) => {
  reply.type('text/html');
  return `
<!doctype html>
<html>
  <head>
    <title>FilterPro API Documentation</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/documentation/json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
  `;
});

// OpenAPI JSON endpoint
fastify.get('/documentation/json', async (request, reply) => {
  return fastify.swagger();
});

// Import cron service
import { DatasourceCronService } from './services/DatasourceCronService';

const start = async () => {
  try {
    await connectDb();
    
    // Initialize cron scheduler after DB connection
    const cronService = DatasourceCronService.getInstance();
    await cronService.initializeSchedules();
    
    const port = Number(process.env.PORT || 4000);
    await fastify.listen({ port, host: '0.0.0.0' });
    
    console.log(`✅ Server listening on port ${port}`);
    console.log(`📖 Swagger documentation available at http://localhost:${port}/documentation`);
    
    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('Shutting down gracefully...');
      cronService.stopAll();
      await fastify.close();
      process.exit(0);
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
