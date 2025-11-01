import * as cron from 'node-cron';
import { Datasource } from '../models/Datasource';
import { DatasourceSyncService } from './DatasourceSyncService';

export class DatasourceCronService {
  private static instance: DatasourceCronService;
  private jobs: Map<string, ReturnType<typeof cron.schedule>> = new Map();
  private syncService: DatasourceSyncService;

  private constructor() {
    this.syncService = new DatasourceSyncService();
  }

  static getInstance(): DatasourceCronService {
    if (!DatasourceCronService.instance) {
      DatasourceCronService.instance = new DatasourceCronService();
    }
    return DatasourceCronService.instance;
  }

  /**
   * Converte o intervalo do datasource para formato cron
   */
  private intervalToCron(interval: string): string {
    const intervalMap: Record<string, string> = {
      '5m': '*/5 * * * *',    // A cada 5 minutos
      '15m': '*/15 * * * *',  // A cada 15 minutos
      '1h': '0 * * * *',      // A cada hora (minuto 0)
      '6h': '0 */6 * * *',    // A cada 6 horas (minuto 0)
      '24h': '0 0 * * *'      // A cada 24 horas (meia-noite)
    };
    return intervalMap[interval] || '0 * * * *'; // Default: 1 hora
  }

  /**
   * Agenda um datasource para sincronização automática
   */
  scheduleDatasource(datasourceId: string, interval: string) {
    // Remove job existente se houver
    this.unscheduleDatasource(datasourceId);

    const cronExpression = this.intervalToCron(interval);
    
    const task = cron.schedule(cronExpression, async () => {
      console.log(`[CRON] Iniciando sincronização automática: ${datasourceId}`);
      try {
        const result = await this.syncService.syncDatasource(datasourceId, 'cron');
        console.log(`[CRON] Sincronização concluída: ${datasourceId}`, result.stats);
      } catch (error) {
        console.error(`[CRON] Erro na sincronização: ${datasourceId}`, error);
      }
    }, {
      timezone: 'America/Sao_Paulo' // Ajuste o timezone conforme necessário
    });

    this.jobs.set(datasourceId, task);
    console.log(`[CRON] Datasource agendado: ${datasourceId} (${interval} = ${cronExpression})`);
  }

  /**
   * Remove o agendamento de um datasource
   */
  unscheduleDatasource(datasourceId: string) {
    const job = this.jobs.get(datasourceId);
    if (job) {
      job.stop();
      this.jobs.delete(datasourceId);
      console.log(`[CRON] Datasource desagendado: ${datasourceId}`);
    }
  }

  /**
   * Inicializa todos os agendamentos baseado nos datasources ativos
   */
  async initializeSchedules() {
    console.log('[CRON] Inicializando agendamentos...');
    
    try {
      // Busca todos os datasources com sincronização habilitada
      const datasources = await Datasource.find({
        enabled: true,
        'syncConfig.enabled': true
      });

      console.log(`[CRON] Encontrados ${datasources.length} datasources para agendar`);

      for (const ds of datasources) {
        if (ds.syncConfig?.interval) {
          this.scheduleDatasource(ds.id, ds.syncConfig.interval);
        }
      }

      console.log('[CRON] Agendamentos inicializados com sucesso');
    } catch (error) {
      console.error('[CRON] Erro ao inicializar agendamentos:', error);
    }
  }

  /**
   * Para todos os agendamentos
   */
  stopAll() {
    console.log('[CRON] Parando todos os agendamentos...');
    this.jobs.forEach((job, datasourceId) => {
      job.stop();
      console.log(`[CRON] Job parado: ${datasourceId}`);
    });
    this.jobs.clear();
    console.log('[CRON] Todos os agendamentos foram parados');
  }

  /**
   * Retorna informações sobre os jobs ativos
   */
  getActiveJobs(): Array<{ datasourceId: string; running: boolean }> {
    const jobs: Array<{ datasourceId: string; running: boolean }> = [];
    this.jobs.forEach((task, datasourceId) => {
      jobs.push({
        datasourceId,
        running: true // Task exists, so it's running
      });
    });
    return jobs;
  }

  /**
   * Atualiza o agendamento de um datasource (útil após edição)
   */
  async updateSchedule(datasourceId: string) {
    const datasource = await Datasource.findOne({ id: datasourceId });
    
    if (!datasource) {
      this.unscheduleDatasource(datasourceId);
      return;
    }

    if (datasource.enabled && datasource.syncConfig?.enabled && datasource.syncConfig.interval) {
      this.scheduleDatasource(datasourceId, datasource.syncConfig.interval);
    } else {
      this.unscheduleDatasource(datasourceId);
    }
  }
}
