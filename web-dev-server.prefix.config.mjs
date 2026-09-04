import {readFile} from 'node:fs/promises'

import baseConfig from './web-dev-server.config.mjs'

const indexHtml = new URL('./dist/index.html', import.meta.url)

export default {
  ...baseConfig,
  rootDir: 'dist',
  basePath: '/stammbaum',
  appIndex: '/index.html',
  middleware: [
    ...(baseConfig.middleware ?? []),
    async (ctx, next) => {
      await next()
      if (
        ctx.status === 404 &&
        ctx.method === 'GET' &&
        !ctx.path.split('/').at(-1).includes('.')
      ) {
        ctx.status = 200
        ctx.type = 'html'
        ctx.body = await readFile(indexHtml)
      }
    },
  ],
}
