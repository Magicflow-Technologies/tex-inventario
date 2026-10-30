module.exports = {
  apps: [
    {
      name: '8tex-inventario',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        PORT: 3070,
        NODE_ENV: 'production',
      },
    },
  ],
};
