# Repository Review Findings

## API route typing and validation gaps
- Both device API routes type the `params` argument as a `Promise` and immediately `await` it, even though Next.js supplies a plain object. This mismatches the route handler signature and defeats type safety for `params` while adding unnecessary awaits.
- The device `PATCH` endpoint directly spreads the request body into the update without schema validation or field whitelisting, allowing clients to overwrite protected columns (e.g., `id`, `createdAt`) or store unexpected shapes.
- The device move endpoint also uses the `Promise`-typed `params`, and it accepts `userId` from the body without any authentication/authorization enforcement.

## UI consistency
- The anomaly panel maps the "MEDIUM" severity to a `warning` badge variant that does not exist in the shared `Badge` component. Because the variant is cast to `any`, the badge silently falls back to the default styling, so medium severity items look the same as default and the intented color-coding is lost.

## Recommendations
- Update API route handler signatures to accept `{ params: { id: string } }` directly, remove the redundant `await`, and let Next.js type inference catch missing params. Add schema validation (e.g., Zod) for request bodies to whitelist allowed fields and reject attempts to edit immutable columns.
- Enforce authentication/authorization on mutating endpoints so `userId` is not freely supplied by clients.
- Add an explicit `warning` variant to the `Badge` component (and theme tokens) or remap medium severity to an existing variant so severity-specific styling works as intended.
