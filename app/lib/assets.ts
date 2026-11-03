// Prefix for assets referenced from raw HTML/fetch (<img>, fetch('/data/...')),
// which Next does not rewrite. Set NEXT_PUBLIC_BASE_PATH=/repo-name when
// deploying to https://<user>.github.io/<repo-name>/ (see next.config.ts).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const withBase = (path: string) => `${basePath}${path}`;
