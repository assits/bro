import { defineConfig } from 'father'

export default defineConfig({
  umd: {
    output: 'dist',
    entry: {
      // esm
      'src/index.js': {
        chainWebpack: memo => {
          memo.experiments({ outputModule: true })
          memo.output.libraryTarget('module')
          memo.output.filename('index.esm.js')
          return memo
        }
      },
      // cjs
      'src/index-cjs.js': {
        chainWebpack: memo => {
          memo.output.filename('index.cjs.js')
          memo.output.libraryTarget('commonjs2')
          return memo
        }
      }
    }
  }
})
