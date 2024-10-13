/// <reference types="vitest/config" />
//import { coverageConfigDefaults } from 'vitest/config'
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
    },
    test: {     // Vitest configuration
        dir: 'src', // Base directory to scan for the test files. Default: same as root
        coverage: {
            reportsDirectory: '.coverage',
            reporter: ['text', 'text-summary', 'html', 'lcovonly'],
        },
        browser: {
            provider: 'playwright', // or 'webdriverio'
            enabled: true,
            name: 'chromium', // browser name is required
            // headless: true,
        },
        // The glob patterns Jest uses to detect test files:
        // "**/__tests__/**/*.[jt]s?(x)"
        // "**/?(*.)+(spec|test).[tj]s?(x)"
    },
})