import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatasourceCronService } from '../services/DatasourceCronService';

export default async function (fastify: FastifyInstance) {
  /**
   * GET /admin/cron-jobs
   * Lista todos os jobs de cron ativos
   */
  fastify.get('/admin/cron-jobs', async (request: FastifyRequest, reply: FastifyReply) => {
    const cronService = DatasourceCronService.getInstance();
    const activeJobs = cronService.getActiveJobs();
    
    return {
      totalJobs: activeJobs.length,
      jobs: activeJobs
    };
  });

  /**
   * POST /admin/cron-jobs/reinitialize
   * Reinicializa todos os agendamentos de cron
   */
  fastify.post('/admin/cron-jobs/reinitialize', async (request: FastifyRequest, reply: FastifyReply) => {
    const cronService = DatasourceCronService.getInstance();
    
    // Para todos os jobs existentes
    cronService.stopAll();
    
    // Reinicializa baseado nos datasources atuais
    await cronService.initializeSchedules();
    
    const activeJobs = cronService.getActiveJobs();
    
    return {
      success: true,
      message: 'Cron jobs reinitializados com sucesso',
      totalJobs: activeJobs.length,
      jobs: activeJobs
    };
  });
}
