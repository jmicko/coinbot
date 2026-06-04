# Frontend Refresh Flow

The client keeps durable state fresh through REST fetches, with websocket messages acting as invalidation signals.

## Main Providers

- `UserProvider` owns the current session user from `/api/user`, plus login, logout, registration, and delete-account actions.
- `DataProvider` owns app data such as products, orders, profit, messages, and errors.
- `WebSocketProvider` receives server websocket messages and calls refresh handlers from `DataProvider`.
- `IdentifierProvider` stores recent request identifiers so the tab that made a mutation can ignore its own websocket invalidation.

`CheckUser` decides whether to show login, a loading screen, or the app based on `UserProvider` state.

## Request Identifiers

Mutation hooks add an `X-identifier` header:

- `usePostFetch`
- `usePutFetch`
- `useDeleteFetch`

Server routes can pass that identifier into websocket messages. When `WebSocketProvider` receives a websocket message with an identifier that this tab generated, it ignores that websocket refresh. The initiating tab should already be refreshing through the mutation hook's `refreshCallback`; other tabs and devices do not have the identifier and will refresh from the websocket signal.

This keeps monitor screens fresh while avoiding most duplicate REST fetches in the tab that made the change.

## Important Behavior

- Mutation hooks now await `refreshCallback`, so loading state remains active until the local REST refresh has been triggered and completed.
- Login and registration set the user directly from the POST response instead of clearing user state and waiting for the next connection poll.
- API-key upload refreshes the current user after save, and the server invalidates both API and user caches because saving a valid key also sets `user.active = true`.
- API-key upload imports products before the route returns, refreshes the current user and products locally, and emits websocket `userUpdate`/`productUpdate` messages with the request identifier so other connected clients refresh while the submitting client relies on its local refresh.

## Bugs Fixed In This Pass

- Registration blocked on an unconditional 10-second robot initialization sleep, even for users with no Coinbase credentials.
- The registration form had no loading state, so users could repeatedly submit while waiting.
- The fresh-user API-key form submitted nothing when triggered through the form submit path.
- API-key save could leave `/api/user` stale because the route set `user.active = true` without invalidating the user/settings cache.
- API-key save could leave product data stale until hard refresh because the client refreshed only `/api/user`.
- Invalid Coinbase credentials now return `401` from the API-key update route instead of a generic `500`.

## Remaining Risks

- Not every mutation route consistently includes identifiers in websocket messages yet.
- Identifier tracking is in-memory per browser tab and is still a simple recent-list mechanism.
- Server cache events are process-local; multiple server processes would need shared invalidation.
- Automated tests should cover login, registration, API-key activation, and websocket invalidation behavior before deeper cache cleanup.
