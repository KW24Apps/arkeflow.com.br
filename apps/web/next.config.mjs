/** @type {import('next').NextConfig} */
const config = {
  // standalone permite deploy no VPS com PM2 sem depender do node_modules completo
  output: 'standalone',
}

export default config
