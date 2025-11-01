import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

const LoginSchema = z.object({ email: z.string().email(), password: z.string() });

export default async function (fastify: FastifyInstance) {
  fastify.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });
    const { email, password } = parsed.data;
    const user = await User.findOne({ email }).lean();
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.hashedPassword);
    if (!match) return reply.status(401).send({ error: 'Invalid credentials' });
    const token = fastify.jwt.sign({ sub: user._id, email: user.email, role: user.role, projectKeys: user.projectKeys });
    return { 
      token, 
      user: {
        _id: user._id,
        email: user.email,
        name: user.name || user.email,
        role: user.role
      }
    };
  });

  fastify.post('/auth/validate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const auth = request.headers.authorization as string | undefined;
      if (!auth) return reply.status(401).send({ valid: false });
      const token = auth.replace(/^Bearer\s+/, '');
      const payload = fastify.jwt.verify(token);
      return { valid: true, payload };
    } catch (err) {
      return reply.status(401).send({ valid: false, error: err });
    }
  });
}
