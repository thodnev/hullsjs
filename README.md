## HullsJS — async JS storage on top of IndexedDB (under development)
> [!NOTE]
> HullsJS is currently under development. It is not ready yet.
> Though, feel free to participate in development if you wish
> (highly appreciated).

<p align="center">
    <img src="/logos/logo.jpg" alt="HullsJS logo" style="width: 45%"></img>
    <br>
    JS storage that is: Reliable. Simple. Fast. Small. Async.
    <br>
    And full of golden nuts for you to enjoy
</p>

### Why use HullsJS?
- **HullsJS is small and robust**. Just ... KiB minified brotli (... KiB gzip; ... KiB raw)
  
  Have you heard of a new JS feature proposal [TC39 – Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management)? – It is awesome.
  But it currently requires [polyfilling the `Symbol.dispose`](https://github.com/evanw/esbuild/issues/3920).

  We offer a whole library with a total size smaller than equivalent size of having `Symbol.dispose` polyfilled using core-js.
  And yes, HullsJS also offers you a cushy-fashioned `Symbol.dispose` polyfill *for free* 😉
  
  During the early stages of development, we tried polyfilling the [TC39](https://github.com/tc39/proposal-explicit-resource-management) `Symbol.dispose` the usual way, using [core-js](https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/esnext.symbol.dispose.js).
  But having this sole feature with a means of core-js introduced vast amounts of code into the bundle (+8.1 KiB minified, +3 KiB gzipped, +2.7 KiB brotlied).
  Then we've read some news on core-js and its pushing donations agenda, and finally decided to polyfill the feature ourselves (it is really just one line of code, but which one to choose wisely is not as obvious as it seems).
- **HullsDB is ready-to-use and developer friendly**.
  Original `indexedDB` API is brain-damaging.
  MDN docs give explanations that look like being AI-generated and actually explain
  nothing. For example: there exists indexedDB versioning, but can versions
  be downgraded?; what the initial version should be, a `0` or not?; how the key specified by `keyPath` is different from `primaryKey`?; ...and many more... Good luck trying to find answers to these questions on one's own.

  A developer needs to smoke lots of fine-rolled documentation
  sheets before being able to actually produce some working code.  

  HullsDB fixes that.
- **It is async to the backbone**. Why do one have to remember all this [scheisse](https://translate.google.com/?sl=de&tl=en&text=scheiße&op=translate)? – No, you don't! HullsJS will save your nerves and boost your performance.
- **It is actively developed**. 

### Rationale
HullsJS is opinionated. It means there were some engineering decisions taken.

- DB versioning, as it is done in IndexedDB, is useless.
  
  Modern applications often require complex manipulations, 
  changing table structures on-the-fly.
  Each time you modify the table structure (`objectStorage` in terms of IndexedDB),
  you [have to](...) bump the DB version.
  IndexedDB needs to be reopened with a new version, which triggers version change events when it is least expected. This requires developers to constantly keep in mind such possibilities and handle these events carefully when writing application code.

  But does having two DBs with the same version mean they have the same
  table structure? – Obviously, it does not.

  This way, if DB versioning is needed, it should be done by the application
  code separately (like storing the current db version in a separate table).
  This makes the native IndexedDB versioning mechanism redundant and useless
  logic that the developer still has to always keep in mind when dealing with IndexedDBs.

  HullsJS abstracts away the IndexedDB versioning mechanism by filling and bumping the DB version in API calls as required. Allowing you to focus on your application logic. And if your application ever requires DB versioning, it can be done properly (in a separate table, etc.).



### Thanks
- Hats off to [esbuild](https://github.com/evanw/esbuild) and its author. It is awesome. Comparing speeds with the other tools, it is as fast as [riding Kawasaki](https://esbuild.github.io/faq/#benchmark-details) when the others ride their horse wagons.
And it also provides runtime transforms, so large amounts of core-js stuff aren't needed anymore.
- Many thanks to [ViteJS](https://vitejs.dev/) and its team for allowing devs to quickly
  dive right into the project development, without countless preliminary environment preparations.
- Microsoft. For TypeScript and VSCode codebase. Open Source contributions are great. Though I'm currently using [VSCodium](https://vscodium.com/) (a free VSCode built from source with no telemetry). VSCodium team, huge respect for that. [Atom](https://atom-editor.cc/) once was a base for all of these editors, now it reached Valhalla, but shall we remember the roots.
- [Arch Linux](https://archlinux.org/) devs. You make a great GNU/Linux distro. Set it up once exactly as you wish, then run it for ages with no hassle whatsoever.


### License
This software is licensed under the ISC License. For more information, see [LICENSE file](/LICENSE).
This license applies to the software as a whole, including all future versions and derivatives, unless explicitly modified by the author.

### Logo choice
HullsJS logo is AI-generated by Gemini.
It features a coffin filled with golden nut hulls, with the text "HULLS JS" in a bold, tech-inspired font. The design maintains a clean and modern aesthetic, with a contrast between the dark coffin and the shiny gold of the nut hulls, **symbolizing value and storage**.