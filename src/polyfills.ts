/**
 * Provides polyfills
 * @remarks
 * This file should be normally imported for side-effects only,
 * i.e. `import './polyfills'`
 */

// @ts-ignore Polyfill shit ourselves for `Symbol.dispose`
// per https://github.com/evanw/esbuild/issues/3920
Symbol.dispose ??= Symbol.for('Symbol.dispose')
// Or we can use core-js, bringing a lot of code into the bundle
// (+8.1 KiB pure, +3 KiB gzip, +2.7 KiB brotli)
// import 'core-js/modules/esnext.symbol.dispose'