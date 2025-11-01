import Fastify, { FastifyInstance } from 'fastify';
import { beforeAll, afterAll, describe, it, expect, beforeEach } from '@jest/globals';
import datasourceOptionsRoutes from '../datasource-options';
import mockCitiesRoutes from '../mock-cities';
import mockCountriesRoutes from '../mock-countries';
import { Datasource } from '../../models/Datasource';

describe('Datasource Options Route', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    app.register(datasourceOptionsRoutes);
    app.register(mockCitiesRoutes);
    app.register(mockCountriesRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Template Resolution', () => {
    beforeEach(() => {
      // Mock Datasource.findOne
      jest.spyOn(Datasource, 'findOne').mockImplementation((query: any) => {
        if (query.id === 'cities-api') {
          return Promise.resolve({
            id: 'cities-api',
            type: 'rest_api',
            config: {
              baseUrl: 'http://localhost:4000/mock-cities',
              method: 'GET',
              queryParams: {
                country: '{{country}}'
              }
            }
          } as any);
        }
        if (query.id === 'countries-api') {
          return Promise.resolve({
            id: 'countries-api',
            type: 'rest_api',
            config: {
              baseUrl: 'http://localhost:4000/mock-countries',
              method: 'GET',
              queryParams: {
                city: '{{city}}'
              }
            }
          } as any);
        }
        return Promise.resolve(null);
      });
    });

    it('should load all cities when no country filter is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      expect(Array.isArray(cities)).toBe(true);
      expect(cities.length).toBeGreaterThan(0);
      
      // Deve conter cidades de ambos países
      const cityValues = cities.map((c: any) => c.value);
      expect(cityValues).toContain('sao-paulo');
      expect(cityValues).toContain('california');
    });

    it('should filter cities when country=BR is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options?country=BR'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      expect(Array.isArray(cities)).toBe(true);
      
      // Deve conter apenas cidades brasileiras
      const cityValues = cities.map((c: any) => c.value);
      expect(cityValues).toContain('sao-paulo');
      expect(cityValues).toContain('rio-de-janeiro');
      expect(cityValues).not.toContain('california');
    });

    it('should filter cities when country=US is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options?country=US'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      expect(Array.isArray(cities)).toBe(true);
      
      // Deve conter apenas cidades americanas
      const cityValues = cities.map((c: any) => c.value);
      expect(cityValues).toContain('california');
      expect(cityValues).toContain('texas');
      expect(cityValues).not.toContain('sao-paulo');
    });

    it('should load all countries when no city filter is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/countries-api/options'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBe(2);
      
      const countryValues = countries.map((c: any) => c.value);
      expect(countryValues).toContain('BR');
      expect(countryValues).toContain('US');
    });

    it('should filter countries when city=sao-paulo is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/countries-api/options?city=sao-paulo'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBe(1);
      
      // Deve retornar apenas Brazil
      expect(countries[0].value).toBe('BR');
      expect(countries[0].label).toBe('Brazil');
    });

    it('should filter countries when city=california is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/countries-api/options?city=california'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBe(1);
      
      // Deve retornar apenas USA
      expect(countries[0].value).toBe('US');
      expect(countries[0].label).toBe('USA');
    });

    it('should remove unresolved templates from query params', async () => {
      // Quando não há valor para substituir {{country}}, não deve enviar o parâmetro
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      
      // Deve retornar todas as cidades (comportamento sem filtro)
      expect(cities.length).toBeGreaterThan(4); // Mais de 4 cidades no total
    });

    it('should handle case-insensitive country codes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/datasources/cities-api/options?country=brazil'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      
      // Deve funcionar com "brazil" minúsculo
      const cityValues = cities.map((c: any) => c.value);
      expect(cityValues).toContain('sao-paulo');
      expect(cityValues).toContain('rio-de-janeiro');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 when datasource does not exist', async () => {
      jest.spyOn(Datasource, 'findOne').mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/datasources/non-existent/options'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Datasource não encontrado');
    });
  });
});
