module.exports = {
  apps: [
    {
      name: 'arkeflow-api',
      cwd: './apps/api',
      script: 'dist/server.js',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'arkeflow-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
}
