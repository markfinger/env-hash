# env-hash

Produces a hash value representing the state of a _typical_ Node/NPM environment.

By default, the hash generated is a product of the mtimes and content of selected
files and directories. By default, `package.json` and `node_modules` are used.

This package is used by [unfort](https://github.com/markfinger/unfort) to produce
hash values that namespace cached data. This enables unfort to aggressively cache
data that will be invalidated automatically when the next generated hash differs
from the previous.


## Install

`npm install --save env-hash`


## Example

```js
import envHash from 'env-hash';

envHash().then(hash => {
  console.log(hash);
  // something like 3983761008_3107418173
});
```

## Options

Env-hash accepts three options, `root`, `files` and `directories`.

- `root` is the origin directory that is prepended to all relative paths. Defaults to `process.cwd()`
- `files` is an array of relative or absolute file paths. Defaults to `['package.json']`
- `directories` is an array of relative or absolute directory paths. Defaults to `['node_modules']`

Options can be specified in an object passed to env-hash:

```js
import envHash from 'env-hash';

envHash({
  // defaults
  root: process.cwd(),
  files: ['package.json'],
  directories: ['node_modules']
}).then(hash => {
  console.log(hash);
  // something like 3983761008_3107418173
});
```


## Background & trade-offs

A section from the original research and design docs of unfort:

> We aggressively cache path resolution of external packages, but, as always, cache
invalidation is a pain. To resolve if our cached data is still valid, we need a
way to uniquely identify the state of the node_modules package tree.

> The most accurate, but slowest, method would be to crawl node_modules and generate
a hash from the file tree. This would work well on small code bases, but more typical
package trees will introduce multiple seconds of overhead as the tree is crawled.
While non-blocking IO would help to prevent unblock the event loop, crawling the tree
will still consume most of libuv's thread pool, let alone blocking any code that
depends on the result of the crawl.

> A similar - and somewhat more performant - approach is to use the same mechanism that
NPM uses to walk the tree, eg: recursively read the package.json, then look in
node_modules for more modules, etc. This still has a fair measure of IO overhead
though. It also requires you to introspect each package's package.json in some fashion,
either hashing the contents, reading the version, or just stating the file.

> The simplest - and most performant - solution would be to treat the root package.json
as a canonical indicator, and simply hash its content. However, in practice this falls
apart as NPM will install packages that are semantic version compatible, but that may
not match the exact versions specified in package.json. Additionally, as NPM 3 builds
the dependency tree non-deterministically, the state of the node_modules tree can't be
relied upon without interrogating it.

> A performant approach - that maintains some accuracy - is to do a shallow crawl of the
node_modules directory's contents, and build a hash from each directory's names and
mtimes. This works reasonably well in practice, but does depend on NPM not making any
changes further up in the directory structure.

> Mindful of both performance and accuracy requirements, we'll combine the package.json
and shallow crawl approaches to produce a single hash which is then used to namespace
cached data. This approach does add a bit of IO overhead, but it seems to work well
enough for the purposes of rapidly detecting the state of an environment.