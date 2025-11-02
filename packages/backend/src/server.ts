import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
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

// Swagger configuration - MUST be registered before routes
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
}).after(() => {
  fastify.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
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
