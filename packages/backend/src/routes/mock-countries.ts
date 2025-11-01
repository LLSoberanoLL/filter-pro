import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Mock de países - agora retorna com array de cidades
const countriesData = [
  { 
    label: 'Brazil', 
    value: 'BR',
    cities: ['sao-paulo', 'rio-de-janeiro', 'brasilia', 'belo-horizonte']
  },
  { 
    label: 'USA', 
    value: 'US',
    cities: ['california', 'texas', 'florida', 'new-york']
  },
];

// Mapeamento de cidades para países
const cityToCountry: Record<string, string> = {
  'sao-paulo': 'BR',
  'rio-de-janeiro': 'BR',
  'brasilia': 'BR',
  'belo-horizonte': 'BR',
  'california': 'US',
  'texas': 'US',
  'florida': 'US',
  'new-york': 'US',
};

export default async function (fastify: FastifyInstance) {
  // Endpoint para retornar países, opcionalmente filtrados por cidade
  fastify.get('/mock-countries', async (request: FastifyRequest<{
    Querystring: { city?: string }
  }>, reply: FastifyReply) => {
    const { city } = request.query;
    
    console.log('🌍 Mock Countries Request:', { city });
    
    if (!city) {
      // Retorna todos os países
      console.log('✅ All countries:', { count: countriesData.length });
      return countriesData;
    }
    
    // Buscar o país da cidade
    const countryCode = cityToCountry[city.toLowerCase()];
    
    if (countryCode) {
      const filteredCountries = countriesData.filter(c => c.value === countryCode);
      console.log('✅ Countries with city:', { city, countries: filteredCountries });
      return filteredCountries;
    }
    
    console.log('⚠️ City not found:', { city });
    return [];
  });
}
