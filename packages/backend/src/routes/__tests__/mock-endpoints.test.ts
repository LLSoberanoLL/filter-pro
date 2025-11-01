import Fastify, { FastifyInstance } from 'fastify';
import { beforeAll, afterAll, describe, it, expect } from '@jest/globals';
import mockCitiesRoutes from '../mock-cities';
import mockCountriesRoutes from '../mock-countries';

describe('Mock Cities Route', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    app.register(mockCitiesRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /mock-cities', () => {
    it('should return all cities when no filter is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-cities'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      expect(Array.isArray(cities)).toBe(true);
      expect(cities.length).toBeGreaterThan(0);

      // Verificar que tem cidades de ambos países
      const cityValues = cities.map(c => c.value);
      expect(cityValues).toContain('sao-paulo');
      expect(cityValues).toContain('california');
    });

    it('should return only Brazilian cities when country=BR', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-cities?country=BR'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      expect(cities.length).toBe(4);

      const cityValues = cities.map(c => c.value);
      expect(cityValues).toEqual(['sao-paulo', 'rio-de-janeiro', 'brasilia', 'belo-horizonte']);
    });

    it('should return only US cities when country=US', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-cities?country=US'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      expect(cities.length).toBe(4);

      const cityValues = cities.map(c => c.value);
      expect(cityValues).toEqual(['california', 'texas', 'florida', 'new-york']);
    });

    it('should be case-insensitive for country parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-cities?country=brazil'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      
      const cityValues = cities.map(c => c.value);
      expect(cityValues).toContain('sao-paulo');
      expect(cityValues).toContain('rio-de-janeiro');
    });

    it('should return empty array for unknown country', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-cities?country=UNKNOWN'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      expect(cities).toEqual([]);
    });

    it('should remove duplicate cities when returning all', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-cities'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      
      // Verificar que não há duplicatas
      const cityValues = cities.map(c => c.value);
      const uniqueValues = [...new Set(cityValues)];
      expect(cityValues.length).toBe(uniqueValues.length);
    });
  });
});

describe('Mock Countries Route', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    app.register(mockCountriesRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /mock-countries', () => {
    it('should return all countries when no filter is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-countries'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      expect(countries.length).toBe(2);

      const countryValues = countries.map(c => c.value);
      expect(countryValues).toContain('BR');
      expect(countryValues).toContain('US');
    });

    it('should return only Brazil when city=sao-paulo', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-countries?city=sao-paulo'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      expect(countries.length).toBe(1);
      expect(countries[0].value).toBe('BR');
      expect(countries[0].label).toBe('Brazil');
    });

    it('should return only USA when city=california', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-countries?city=california'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      expect(countries.length).toBe(1);
      expect(countries[0].value).toBe('US');
      expect(countries[0].label).toBe('USA');
    });

    it('should be case-insensitive for city parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-countries?city=SAO-PAULO'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      expect(countries.length).toBe(1);
      expect(countries[0].value).toBe('BR');
    });

    it('should return empty array for unknown city', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-countries?city=unknown-city'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      expect(countries).toEqual([]);
    });
  });

  describe('Bidirectional Filtering', () => {
    it('should support reverse filtering from city to country', async () => {
      const app = Fastify();
      app.register(mockCountriesRoutes);
      await app.ready();

      // Verificar que cada cidade mapeia para o país correto
      const testCases = [
        { city: 'sao-paulo', expectedCountry: 'BR' },
        { city: 'rio-de-janeiro', expectedCountry: 'BR' },
        { city: 'california', expectedCountry: 'US' },
        { city: 'texas', expectedCountry: 'US' },
      ];

      for (const { city, expectedCountry } of testCases) {
        const response = await app.inject({
          method: 'GET',
          url: `/mock-countries?city=${city}`
        });

        const countries = JSON.parse(response.body);
        expect(countries.length).toBe(1);
        expect(countries[0].value).toBe(expectedCountry);
      }

      await app.close();
    });
  });
});
