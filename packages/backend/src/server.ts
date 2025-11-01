import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
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

// Datasource options route
import datasourceOptionsRoutes from './routes/datasource-options';
fastify.register(datasourceOptionsRoutes);

const start = async () => {
  try {
    await connectDb();
    await fastify.listen({ port: Number(process.env.PORT || 4000), host: '0.0.0.0' });
    console.log(`Server listening on port ${process.env.PORT || 4000}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
