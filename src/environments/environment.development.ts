export const environment = {
  production: false,
  appName: 'DESCO',
  apiBaseUrl: 'http://localhost:8080',
  openApiUrl: 'http://localhost:8080/v3/api-docs',
  defaultPageSize: 20,
  maxPageSize: 200,
  map: {
    defaultLatitude: -15.2497,
    defaultLongitude: -73.2478,
    defaultZoom: 12,
  },
} as const;
