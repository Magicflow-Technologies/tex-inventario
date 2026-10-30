==============================================================
8TEX INVENTARIO - GUIA RAPIDA DE DESPLIEGUE EN VPS (IGUAL A CONA)
==============================================================

1. Subir 8tex-inventario-actualizado.zip a /var/www/8tex-inventario en tu VPS.

2. Entrar a la carpeta y descomprimir:
   cd /var/www/8tex-inventario
   unzip -o 8tex-inventario-actualizado.zip
   rm -f 8tex-inventario-actualizado.zip

3. Instalar dependencias de produccion:
   npm install --omit=dev

4. Iniciar o recargar con PM2 (Puerto 3070):
   pm2 start ecosystem.config.cjs
   (o si ya estaba corriendo: pm2 reload 8tex-inventario)

5. Guardar estado de PM2:
   pm2 save

6. Verificar el estado y logs:
   pm2 status
   pm2 logs 8tex-inventario
==============================================================
