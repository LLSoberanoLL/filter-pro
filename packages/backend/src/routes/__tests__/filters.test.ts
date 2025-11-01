import Fastify from 'fastify';
import mockCitiesRoutes from '../mock-cities';
import mockCountriesRoutes from '../mock-countries';

describe('Bidirectional Filter Dependencies - Mock Endpoints', () => {
  let app: any;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    app.register(mockCitiesRoutes);
    app.register(mockCountriesRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Scenario 1: Initial State (No Filters)', () => {
    test('should return all countries when no city filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-countries'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      expect(countries).toHaveLength(2);
      
      const values = countries.map((c: any) => c.value);
      expect(values).toContain('BR');
      expect(values).toContain('US');
    });

    test('should return all cities when no country filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-cities'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      expect(cities.length).toBeGreaterThan(4);
      
      const values = cities.map((c: any) => c.value);
      expect(values).toContain('sao-paulo');
      expect(values).toContain('california');
    });
  });

  describe('Scenario 2: Forward Filtering (Country → City)', () => {
    test('should filter cities when country=BR', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-cities?country=BR'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      expect(cities).toHaveLength(4);
      
      const values = cities.map((c: any) => c.value);
      expect(values).toEqual(['sao-paulo', 'rio-de-janeiro', 'brasilia', 'belo-horizonte']);
    });

    test('should filter cities when country=US', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-cities?country=US'
      });

      expect(response.statusCode).toBe(200);
      const cities = JSON.parse(response.body);
      expect(cities).toHaveLength(4);
      
      const values = cities.map((c: any) => c.value);
      expect(values).toEqual(['california', 'texas', 'florida', 'new-york']);
    });
  });

  describe('Scenario 3: Reverse Filtering (City → Country)', () => {
    test('should filter countries when city=sao-paulo', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-countries?city=sao-paulo'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      expect(countries).toHaveLength(1);
      expect(countries[0].value).toBe('BR');
      expect(countries[0].label).toBe('Brazil');
    });

    test('should filter countries when city=california', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-countries?city=california'
      });

      expect(response.statusCode).toBe(200);
      const countries = JSON.parse(response.body);
      expect(countries).toHaveLength(1);
      expect(countries[0].value).toBe('US');
      expect(countries[0].label).toBe('USA');
    });

    test('should filter countries for all Brazilian cities', async () => {
      const brazilianCities = ['sao-paulo', 'rio-de-janeiro', 'brasilia', 'belo-horizonte'];

      for (const city of brazilianCities) {
        const response = await app.inject({
          method: 'GET',
          url: `/mock-countries?city=${city}`
        });

        const countries = JSON.parse(response.body);
        expect(countries).toHaveLength(1);
        expect(countries[0].value).toBe('BR');
      }
    });

    test('should filter countries for all US cities', async () => {
      const usCities = ['california', 'texas', 'florida', 'new-york'];

      for (const city of usCities) {
        const response = await app.inject({
          method: 'GET',
          url: `/mock-countries?city=${city}`
        });

        const countries = JSON.parse(response.body);
        expect(countries).toHaveLength(1);
        expect(countries[0].value).toBe('US');
      }
    });
  });

  describe('Scenario 4: Case-Insensitive Matching', () => {
    test('should handle case-insensitive country codes', async () => {
      const testCases = ['br', 'BR', 'brazil', 'Brazil', 'BRAZIL'];

      for (const country of testCases) {
        const response = await app.inject({
          method: 'GET',
          url: `/mock-cities?country=${country}`
        });

        expect(response.statusCode).toBe(200);
        const cities = JSON.parse(response.body);
        
        const values = cities.map((c: any) => c.value);
        expect(values).toContain('sao-paulo');
        expect(values).toContain('rio-de-janeiro');
      }
    });

    test('should handle case-insensitive city names', async () => {
      const testCases = ['sao-paulo', 'SAO-PAULO', 'Sao-Paulo'];

      for (const city of testCases) {
        const response = await app.inject({
          method: 'GET',
          url: `/mock-countries?city=${city}`
        });

        expect(response.statusCode).toBe(200);
        const countries = JSON.parse(response.body);
        expect(countries).toHaveLength(1);
        expect(countries[0].value).toBe('BR');
      }
    });
  });

  describe('Scenario 5: Edge Cases', () => {
    test('should return empty array for invalid country', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-cities?country=INVALID'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual([]);
    });

    test('should return empty array for invalid city', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-countries?city=invalid-city'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual([]);
    });

    test('should remove duplicate cities', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mock-cities'
      });

      const cities = JSON.parse(response.body);
      const values = cities.map((c: any) => c.value);
      const uniqueValues = [...new Set(values)];
      
      expect(values.length).toBe(uniqueValues.length);
    });
  });

  describe('Scenario 6: Data Consistency', () => {
    test('all cities should map to correct country', async () => {
      // Get all cities
      const citiesResponse = await app.inject({
        method: 'GET',
        url: '/mock-cities'
      });
      const allCities = JSON.parse(citiesResponse.body);

      // For each city, verify it maps to a valid country
      for (const city of allCities) {
        const countryResponse = await app.inject({
          method: 'GET',
          url: `/mock-countries?city=${city.value}`
        });

        const countries = JSON.parse(countryResponse.body);
        expect(countries.length).toBeGreaterThan(0);
        expect(['BR', 'US']).toContain(countries[0].value);
      }
    });

    test('filtering and unfiltering should return consistent results', async () => {
      // Get all cities
      const allCitiesResponse = await app.inject({
        method: 'GET',
        url: '/mock-cities'
      });
      const allCities = JSON.parse(allCitiesResponse.body);

      // Filter by BR
      const brCitiesResponse = await app.inject({
        method: 'GET',
        url: '/mock-cities?country=BR'
      });
      const brCities = JSON.parse(brCitiesResponse.body);

      // Filter by US
      const usCitiesResponse = await app.inject({
        method: 'GET',
        url: '/mock-cities?country=US'
      });
      const usCities = JSON.parse(usCitiesResponse.body);

      // Sum should equal total (accounting for duplicates removed)
      const filteredTotal = brCities.length + usCities.length;
      expect(allCities.length).toBeLessThanOrEqual(filteredTotal);
    });
  });
});
