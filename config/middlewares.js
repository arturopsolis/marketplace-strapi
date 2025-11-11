module.exports = [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'https://strapi-production-9c41.up.railway.app',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'https://strapi-production-9c41.up.railway.app',
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      origin: [
        // Desarrollo local
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:1337',

        // Railway (Strapi admin)
        'https://strapi-production-9c41.up.railway.app',

        // Producción - KnitBoxing
        'https://knitboxing.corazolana.com',

        // Por si acaso usas www
        'https://www.knitboxing.corazolana.com',
      ],
      credentials: true,
      headers: [
        'Content-Type',
        'Authorization',
        'Origin',
        'Accept',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    },
  },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
