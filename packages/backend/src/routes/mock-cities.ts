import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Mock de cidades por país
const citiesByCountry: Record<string, Array<{ label: string; value: string }>> = {
  'BR': [
    { label: 'São Paulo', value: 'sao-paulo' },
    { label: 'Rio de Janeiro', value: 'rio-de-janeiro' },
    { label: 'Brasília', value: 'brasilia' },
    { label: 'Belo Horizonte', value: 'belo-horizonte' },
  ],
  'US': [
    { label: 'California', value: 'california' },
    { label: 'Texas', value: 'texas' },
    { label: 'Florida', value: 'florida' },
    { label: 'New York', value: 'new-york' },
  ],
  'Brazil': [
    { label: 'São Paulo', value: 'sao-paulo' },
    { label: 'Rio de Janeiro', value: 'rio-de-janeiro' },
  ],
  'USA': [
    { label: 'California', value: 'california' },
    { label: 'Texas', value: 'texas' },
  ]
};

export default async function (fastify: FastifyInstance) {
  // Endpoint para retornar cidades filtradas por país
  fastify.get('/mock-cities', async (request: FastifyRequest<{
    Querystring: { country?: string; city?: string }
  }>, reply: FastifyReply) => {
    const { country, city } = request.query;
    
    console.log('🌍 Mock Cities Request:', { country, city });
    
    // Se pediu uma cidade específica, retorna todos os países que têm essa cidade
    if (city) {
      const countriesWithCity = Object.entries(citiesByCountry)
        .filter(([_, cities]) => 
          cities.some(c => c.value.toLowerCase() === city.toLowerCase())
        )
        .map(([countryCode]) => ({
          label: countryCode === 'BR' || countryCode === 'Brazil' ? 'Brazil' : 'USA',
          value: countryCode === 'BR' || countryCode === 'Brazil' ? 'BR' : 'US'
        }));
      
      console.log('✅ Countries with city:', { city, countries: countriesWithCity });
      return countriesWithCity;
    }
    
    if (!country) {
      // Se não passou país, retorna todas as cidades
      const allCities = Object.values(citiesByCountry).flat();
      // Remover duplicatas (São Paulo e Rio aparecem duas vezes)
      const uniqueCities = allCities.filter((city, index, self) =>
        index === self.findIndex(c => c.value === city.value)
      );
      console.log('✅ All cities:', { count: uniqueCities.length });
      return uniqueCities;
    }
    
    // Buscar case-insensitive
    const countryKey = Object.keys(citiesByCountry).find(
      key => key.toLowerCase() === country.toLowerCase()
    );
    
    const cities = countryKey ? citiesByCountry[countryKey] : [];
    console.log('✅ Cities found:', { country, countryKey, count: cities.length });
    
    return cities;
  });
}
