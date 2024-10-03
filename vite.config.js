import { defineConfig } from 'vite'
import { resolve } from 'path'
import browserslistToEsbuild from 'browserslist-to-esbuild'

export default defineConfig({
    esbuild: {
        target: ['es2022', 'firefox128']
        // https://vitejs.dev/config/build-options#build-target
        // https://vitejs.dev/guide/features#target
        // https://esbuild.github.io/api/#target
        //target: ['esnext'].concat(browserslistToEsbuild('>0.5%, not dead, not op_mini all'))
    }
})