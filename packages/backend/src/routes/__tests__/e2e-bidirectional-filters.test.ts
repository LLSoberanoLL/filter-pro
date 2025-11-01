import Fastify, { FastifyInstance } from 'fastify';
import { beforeAll, afterAll, describe, it, expect } from '@jest/globals';
import datasourceOptionsRoutes from '../datasource-options';
import mockCitiesRoutes from '../mock-cities';
import mockCountriesRoutes from '../mock-countries';
import { Datasource } from '../../models/Datasource';

/**
 * Testes de integração E2E que simulam o fluxo completo de filtros com dependências bidirecionais
 */
describe('E2E: Bidirectional Filter Dependencies', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    
    // Registrar todas as rotas necessárias
    app.register(datasourceOptionsRoutes);
    app.register(mockCitiesRoutes);
    app.register(mockCountriesRoutes);
    
    await app.ready();

    // Mock dos datasources
    jest.spyOn(Datasource, 'findOne').mockImplementation((query: any) => {
      if (query.id === 'cities-api') {
        return Promise.resolve({
          id: 'cities-api',
          projectKey: 'demo-project',
          type: 'rest_api',
          config: {
            baseUrl: 'http://localhost:4000/mock-cities',
            method: 'GET',
            queryParams: { country: '{{country}}' },
            responsePath: ''
          }
        } as any);
      }
      if (query.id === 'countries-api') {
        return Promise.resolve({
          id: 'countries-api',
          projectKey: 'demo-project',
          type: 'rest_api',
          config: {
            baseUrl: 'http://localhost:4000/mock-countries',
            method: 'GET',
            queryParams: { city: '{{city}}' },
            responsePath: ''
          }
        } as any);
      }
      return Promise.resolve(null);
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Scenario 1: Initial State (No Filters Selected)', () => {
    it('should load all countries when no city is selected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/countries-api/options'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      
      expect(countries).toHaveLength(2);
      expect(countries.map((c: any) => c.value)).toEqual(['BR', 'US']);
    });

    it('should load all cities when no country is selected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      
      expect(cities.length).toBeGreaterThan(4);
      
      // Deve conter cidades de ambos países
      const cityValues = cities.map((c: any) => c.value);
      expect(cityValues).toContain('sao-paulo');
      expect(cityValues).toContain('california');
    });
  });

  describe('Scenario 2: User Selects Country First', () => {
    it('should filter cities when country=BR is selected', async () => {
      // Simula: Usuário seleciona "Brazil" no filtro Country
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options?country=BR'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      
      // Deve retornar apenas cidades brasileiras
      expect(cities).toHaveLength(4);
      const cityValues = cities.map((c: any) => c.value);
      expect(cityValues).toEqual(['sao-paulo', 'rio-de-janeiro', 'brasilia', 'belo-horizonte']);
      
      // Não deve conter cidades americanas
      expect(cityValues).not.toContain('california');
      expect(cityValues).not.toContain('texas');
    });

    it('should filter cities when country=US is selected', async () => {
      // Simula: Usuário seleciona "USA" no filtro Country
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options?country=US'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      
      // Deve retornar apenas cidades americanas
      expect(cities).toHaveLength(4);
      const cityValues = cities.map((c: any) => c.value);
      expect(cityValues).toEqual(['california', 'texas', 'florida', 'new-york']);
      
      // Não deve conter cidades brasileiras
      expect(cityValues).not.toContain('sao-paulo');
      expect(cityValues).not.toContain('rio-de-janeiro');
    });
  });

  describe('Scenario 3: User Selects City First (Reverse Filtering)', () => {
    it('should filter countries when city=sao-paulo is selected', async () => {
      // Simula: Usuário seleciona "São Paulo" no filtro City
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/countries-api/options?city=sao-paulo'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      
      // Deve retornar apenas Brazil
      expect(countries).toHaveLength(1);
      expect(countries[0].value).toBe('BR');
      expect(countries[0].label).toBe('Brazil');
    });

    it('should filter countries when city=california is selected', async () => {
      // Simula: Usuário seleciona "California" no filtro City
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/countries-api/options?city=california'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      
      // Deve retornar apenas USA
      expect(countries).toHaveLength(1);
      expect(countries[0].value).toBe('US');
      expect(countries[0].label).toBe('USA');
    });
  });

  describe('Scenario 4: User Changes Selection', () => {
    it('should update cities when user changes country from BR to US', async () => {
      // Primeiro: Usuário seleciona Brazil
      let response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options?country=BR'
      });
      
      let cities = JSON.parse(response.body);
      expect(cities.map((c: any) => c.value)).toContain('sao-paulo');

      // Depois: Usuário muda para USA
      response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options?country=US'
      });
      
      cities = JSON.parse(response.body);
      expect(cities.map((c: any) => c.value)).toContain('california');
      expect(cities.map((c: any) => c.value)).not.toContain('sao-paulo');
    });

    it('should restore all options when user clears selection', async () => {
      // Usuário seleciona um país
      let response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options?country=BR'
      });
      
      expect(JSON.parse(response.body)).toHaveLength(4);

      // Usuário limpa a seleção (volta para "Selecione...")
      response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options'
      });
      
      const allCities = JSON.parse(response.body);
      expect(allCities.length).toBeGreaterThan(4); // Deve ter todas as cidades
    });
  });

  describe('Scenario 5: Data Consistency', () => {
    it('should maintain data consistency across all Brazilian cities', async () => {
      const brazilianCities = ['sao-paulo', 'rio-de-janeiro', 'brasilia', 'belo-horizonte'];

      for (const city of brazilianCities) {
        const response = await app.inject({
          method: 'GET',
          url: `/datasources/countries-api/options?city=${city}`
        });

        const countries = JSON.parse(response.body);
        expect(countries).toHaveLength(1);
        expect(countries[0].value).toBe('BR');
      }
    });

    it('should maintain data consistency across all US cities', async () => {
      const usCities = ['california', 'texas', 'florida', 'new-york'];

      for (const city of usCities) {
        const response = await app.inject({
          method: 'GET',
          url: `/datasources/countries-api/options?city=${city}`
        });

        const countries = JSON.parse(response.body);
        expect(countries).toHaveLength(1);
        expect(countries[0].value).toBe('US');
      }
    });
  });

  describe('Scenario 6: Edge Cases', () => {
    it('should handle invalid country gracefully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options?country=INVALID'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual([]);
    });

    it('should handle invalid city gracefully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/countries-api/options?city=invalid-city'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual([]);
    });

    it('should be case-insensitive', async () => {
      const testCases = [
        { url: '/datasources/cities-api/options?country=brazil', expectedCity: 'sao-paulo' },
        { url: '/datasources/cities-api/options?country=BRAZIL', expectedCity: 'sao-paulo' },
        { url: '/datasources/countries-api/options?city=SAO-PAULO', expectedCountry: 'BR' },
      ];

      for (const { url, expectedCity, expectedCountry } of testCases) {
        const response = await app.inject({ method: 'GET', url });
        expect(response.statusCode).toBe(200);
        
        const data = JSON.parse(response.body);
        expect(data.length).toBeGreaterThan(0);
        
        if (expectedCity) {
          expect(data.map((d: any) => d.value)).toContain(expectedCity);
        }
        if (expectedCountry) {
          expect(data[0].value).toBe(expectedCountry);
        }
      }
    });
  });
});
