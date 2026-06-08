# Robot Sync Loop

This document describes how `server/modules/robot.js` currently tries to keep Coinbot's local order book aligned with Coinbase. It is descriptive, not a claim that the design is complete or safe enough.

## Core Constraint

Coinbase limits how many open orders an account can have at once. Coinbot can track far more trade pairs than Coinbase can keep open. The database is therefore the full local order book, while Coinbase only holds a moving window of orders near the active market.

That creates two hard problems:

- Coinbase balances are not enough. The bot needs to subtract funds committed to local DB orders that may not currently be open on Coinbase.
- Coinbase state can change between any two API calls. An order can settle after balances are read but before orders are checked, or after orders are checked but before the next local write.

The current design handles this by keeping a local ledger in PostgreSQL, syncing often, doing most work in small batches, and trying to make each loop converge toward a consistent state.

## Runtime State

At startup, `robot.startSync()`:

1. forks `candleMaker`
2. loads global bot settings into `botSettings`
3. loads all users from the database
4. initializes per-user runtime state in `userStorage`, `messenger`, and `cbClients`
5. starts the per-user loops
6. starts scheduled push notification setup

For each user, `initializeUserLoops()` starts:

- `syncOrders(userID)`: REST-based Coinbase/order synchronization
- `processingLoop(userID)`: local settled-order processing and flipping
- `startWebsocket(userID)`: Coinbase websocket updates for faster order/ticker notifications

All of this is process-local and now lives under `server/modules/runtime/`. Restarting the server rebuilds runtime state from the database. Database query caching is separate and lives in the table-oriented database modules.

## Trading Gates

Coinbase work should only happen when all of these are true:

- user is active
- user is approved
- user is not paused, except for some read-only refresh work
- global maintenance mode is off
- a Coinbase client exists for the user

Recent guard code treats missing API credentials as a disabled Coinbase client, not as a reason to mark the user inactive. This keeps the user/account state independent from credential availability.

Maintenance mode is the development and operations no-trade switch. Automated order sync/processing paths must not place, replace, or reorder trades while it is on. Direct route handlers that create new exposure, such as manual market trades and auto setup, should also reject requests while maintenance is on. Read-only connections such as browser websockets, Coinbase websocket subscriptions, and candle refreshes may still run as long as their handlers do not trigger trade placement. Cancel/delete routes are safety controls and may remain available.

## Main Sync Loop

`syncOrders(userID)` is the main repeating REST loop.

Current order:

1. Increment the user's loop counter.
2. Send a heartbeat to the browser.
3. If the runtime product catalog is empty, load it before trading. After a successful load, refresh it no more than once every 15 minutes from inside the same main loop.
   - Catalog readiness and metadata are tracked separately for each user.
   - The refresh timestamp is process-local and resets on server restart.
   - Concurrent refresh requests for the same user share one in-flight operation.
   - The previous catalog remains available until a complete replacement succeeds.
   - Persist only new or changed product identity fields.
   - Mark products missing from that user's latest catalog unavailable without deleting their rows.
   - Keep volatile Coinbase fields and precomputed decimal helpers in memory.
4. If the user may trade:
   - run `fullSync()` every `full_sync` loops
   - otherwise run `quickSync()` and then `deSync()`
5. Run `updateMultipleOrders()` against the user's queued `ordersToCheck`.
6. Refresh available funds if the user is active/approved and maintenance is off.
   - Coinbase account balances are fetched on every refresh.
   - Reserved base and quote totals are read from a per-user cache backed by one grouped database query.
   - The reservation cache is invalidated only when an order mutation can change the reserved amount.
   - The subsequent currency ledger calculation remains unchanged.
7. Schedule the next loop after rate-limit padding and `loop_speed`.

The loop is designed to keep Coinbase calls grouped and rate-limited, then update local records after gathering enough context.

## Full Sync

`fullSync(userID)` does the heavier reconciliation pass:

1. Load a limited set of local unsettled orders near the spread.
   - The local result contains only `order_id`, `reorder`, and `will_cancel`; reconciliation does not need complete order details.
   - Repeated full-sync passes reuse a process-local cache keyed by user, active products, and `sync_quantity`.
   - A cache miss loads every product's BUY and SELL window in one PostgreSQL query.
2. Load Coinbase open orders.
3. Load Coinbase fee/volume summary.
4. Save fee data locally only when maker fee, taker fee, or volume changed.
5. Load active product IDs.
6. Ignore Coinbase orders for inactive products.
7. Compare local DB order IDs against Coinbase open order IDs.
8. Queue local orders missing from Coinbase into `ordersToCheck`.
9. Cancel Coinbase orders that are not present in the local DB window and mark local matches for reorder.

Important behavior: a local order missing from Coinbase is not immediately assumed settled. It is queued for detail lookup by `updateMultipleOrders()`.

The local full-sync window remains limited independently for each active product and side. Order mutations that can change membership or price ordering invalidate the cached window before the next reconciliation.

## Quick Sync

`quickSync(userID)` is the cheaper pass:

1. Load recent Coinbase fills.
2. Match fill order IDs against local unsettled orders.
3. Patch `filled_at` for rows that were already marked settled but were missing fill time.
4. Load DB orders already marked `reorder = true` inside the current sync window.
   - Repeated passes reuse a process-local cache keyed by user, active products, and `sync_quantity`.
   - Order mutations that can change window membership or ordering invalidate the cache.
5. Queue filled/unsettled orders and reorder candidates into `ordersToCheck`.

This is intended to catch common settlement and reorder work without comparing the whole active Coinbase order set every time.

The reorder query applies one BUY limit and one SELL limit across all active products, preserving the existing behavior. Because absolute prices are not comparable across products, this should eventually be revisited as a product-aware synchronization design rather than changed incidentally during cache cleanup.

## Update Multiple Orders

`updateMultipleOrders(userID)` consumes the user's queued runtime `ordersToCheck` through `userStorage.getOrdersToCheck(userID)`.

For each queued order:

- If `reorder = true` and `will_cancel = false`, call `reorder()`.
- Otherwise call Coinbase `getOrder(order_id)` and update the DB from Coinbase details.
- If Coinbase returns `CANCELLED` or `FAILED`, write that status back with `reorder = true`.
- If Coinbase says the order is not found, increment an in-memory consecutive 404 counter for that user/order.
- If that counter reaches 10 consecutive not-found responses, mark the local order `reorder = true` and let the next normal reorder pass handle placement.

The last points are intentional. Coinbase can return not found shortly after an order is placed because the order may not be queryable immediately. The in-memory counter lets one-off propagation delays clear themselves. A successful lookup or any non-404 result clears the counter so old isolated failures do not accumulate over days or weeks. Restarting the server also clears the counter, which is acceptable because it only delays reorder by another small number of loops.

Detection and replacement are staged separately because placing a replacement inside the same error path can create harder-to-reason-about failure modes. For example, Coinbase may be temporarily slow to expose a new order, a portfolio/API scope may hide the original order, or the replacement call may succeed while the follow-up detail lookup fails.

## Reorder

`reorder(orderToReorder)`:

1. Reloads the current DB row.
2. Loads persisted product identity merged with runtime increment/rounding details.
3. Builds a new order using the same side, price, size, and product.
4. Places the order on Coinbase.
5. Fetches the newly placed Coinbase order details.
6. Inserts the new order into `limit_orders`, carrying forward local trade-pair details.
7. Deletes the old local order row.
8. Notifies the browser.

This path is where replacement orders should be placed. It assumes the current DB row is still the desired source of truth.

## Processing Loop

`processingLoop(userID)` runs separately from `syncOrders()`.

If the user may trade, it:

1. Finds local orders marked `settled = true` and `flipped = false`.
2. Builds the opposite-side order with `flipTrade()`.
3. Places the new Coinbase order.
4. Stores the new order in the DB.
5. Marks the old order `flipped = true`.
6. Deletes locally marked-for-cancel orders after processing.

This loop is responsible for the core grid behavior: filled buy becomes sell, filled sell becomes buy.

## Funds Ledger

`updateFunds()` and `getAvailableFunds()` try to build a local available-funds view.

The current calculation:

1. Load Coinbase accounts.
2. Load active products.
3. For each active product, calculate local base committed to SELL orders.
4. Calculate local quote committed to BUY orders.
5. Combine Coinbase available/hold amounts with locally committed amounts.
6. Store per-product available funds in `userStorage`.

This exists because Coinbase only knows what is open on Coinbase. Coinbot also needs to reserve funds for local DB orders that may not currently be synced to Coinbase because of open-order limits.

The Coinbase balance call is only the external baseline. It cannot replace Coinbot's local ledger because it cannot see the unsynced DB-only orders that Coinbot still intends to place. Future portfolio-aware work should improve step 1 by getting the most accurate Coinbase-side available-to-trade number for the relevant portfolio, then still subtract local commitments from `limit_orders`.

Known risk: this is still a snapshot. Deposits, withdrawals, manual Coinbase activity, fills, and API delays can change balances while the loop is running.

### Reservation Transition Guard

When an order flips, Coinbot changes local reservations immediately:

- a settled `SELL` stops reserving base currency locally;
- the replacement `BUY` starts reserving quote currency locally;
- Coinbase account balances may still report the previous settlement state for a short period.

That can temporarily show the base currency as too high and the quote currency as too low. A live LTC-USD incident on June 8, 2026 matched this shape: available USD went negative while available LTC went positive by roughly the flipped trade size.

To avoid publishing that crossing snapshot, reservation-affecting order writes now defer available-funds publication for a short process-local grace period. `updateFunds()` also refuses to publish while there are local `settled = true` / `flipped = false` rows waiting for `processOrders()`, and it discards an in-flight Coinbase account snapshot if a reservation mutation happens before publication.

This does not change the order-placement or flip logic. It only keeps the previous available-funds snapshot visible until the local ledger and Coinbase account baseline are less likely to be in different settlement states.

The June 8 metrics also showed one `robot.syncOrders user:1` invocation that started and did not complete, while another user's loop kept running. The old metrics could not identify the exact await. The sync loop now logs a warning with the current stage if a single invocation runs longer than 30 seconds. Coinbase account pagination also guards against missing or repeated cursors so a bad paginated response fails, logs, and lets the next loop retry instead of waiting forever.

## Fees And Reservations

Fee rates are refreshed during `fullSync()`:

1. `fullSync()` calls Coinbase `getTransactionSummary({ user_native_currency: 'USD' })`.
2. `databaseClient.saveFees()` stores `fee_tier.maker_fee_rate`, `fee_tier.taker_fee_rate`, and the combined advanced-trade/pro volume into `user_settings`.
3. `getAvailableFunds()` uses the stored taker rate when estimating quote committed to local BUY orders: `limit_price * base_size * (1 + taker_fee)`.

That taker-fee padding appears correct for the app's normal non-post-only limit orders. A live dev probe on June 3, 2026 placed and canceled an ETH-USD limit BUY far below market with `post_only = false`:

- notional: about `$19.9999932`
- maker estimate at `0.006`: about `$0.12`
- taker estimate at `0.012`: about `$0.24`
- Coinbase order `total_value_after_fees`: about `$20.2399931`
- portfolio `available_to_trade_fiat` delta: about `-$20.24`

The same probe with `post_only = true` reported `total_value_after_fees` near notional plus maker fee. So Coinbase's immediate estimate depends on the order's `post_only` flag. Most Coinbot orders are currently non-post-only, except the special USDT-USD handling in `flipTrade()`.

Working policy: internal funds and reinvestment safety checks should assume taker fees by default, even when many fills will eventually settle as makers. Available balance, including user-facing available balance, is a spendability/safety number rather than an expected-profit number. During rapid price moves, stale local prices, unpause/recovery bursts, or manually created orders above/below the current price can cause normal limit orders to execute as takers. Over-reserving is annoying but safe; under-reserving can strand the bot in insufficient-funds errors. If Coinbase later returns excess funds because an order settled as maker, that should be treated as extra available balance on a later refresh.

Expected profit displays can still use maker-fee assumptions because they describe the intended grid strategy under normal maker fills. They should not be reused as spendability checks. A separate explicit buffer could be added, but a buffer equal to the maker/taker fee gap lands at the same conservative reservation as taker-fee accounting.

Important mismatch: the reinvestment leftover check inside `flipTrade()` uses `(1 + maker_fee)`, not `(1 + taker_fee)`, when estimating how much quote will remain after pending SELL-to-BUY flips. That can overestimate leftover funds for normal non-post-only BUY orders. In the live test fee tier, the gap was `0.006` of notional: about `$0.12` on a `$20` order, and larger on bigger or simultaneous flips.

Initial setup paths also estimate fees:

- `server/shared.js` estimates `previous_total_fees` for initial SELL rows with `user.taker_fee`.
- `server/routes/orders.router.js` does the same for auto-setup orders.
- `server/modules/simulationWorker.js`, `client/src/components/SingleTrade/SingleTrade.tsx`, and `client/src/components/Trade/LimitOrder.tsx` use maker fees for simulated/displayed profit.
- `calculateProfitBTC()` uses the stored `total_fees + previous_total_fees`, so setup-time estimates can affect profit and reinvestment until the pair has enough real Coinbase fee data carried forward.

The live probe also showed that Coinbase `/accounts` did not report a useful `available_balance` or `hold` delta for this portfolio reservation, while the portfolio breakdown endpoint did. Coinbase's current portfolio docs say Advanced Trade API keys are portfolio-scoped, and the dev key could read the dev portfolio breakdown while getting a 403 on the listed Default portfolio. That means future funds work should become explicitly portfolio-aware for the Coinbase-side baseline, while still relying on Coinbot's local ledger for DB-only orders.

References checked while documenting this:

- Coinbase Advanced Trade portfolio guide: https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/guides/portfolios
- List portfolios endpoint: https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/portfolios/list-portfolios
- Get portfolio breakdown endpoint: https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/portfolios/get-portfolio-breakdown

## Reinvestment

Reinvestment happens inside `flipTrade()` when a settled `SELL` is being flipped back into a `BUY` and the user has reinvestment enabled.

The intended feature:

- A normal ratio, such as 20%, adds a portion of trade-pair profit into the next buy.
- A ratio above 100% can intentionally draw down extra idle account funds over time.
- This spreads a new deposit into trade pairs near the current market price instead of distributing funds evenly across the entire configured range.

Current procedure:

1. Calculate profit from the completed trade pair using original buy/sell prices, size, and fees.
2. Convert profit into base currency at the order price.
3. Multiply profit by `reinvest_ratio`.
4. Add that amount to the next buy size, rounded down.
5. Check optional max-trade settings.
6. Estimate funds that will remain after all pending `SELL` flips in the current processing batch.
7. Only increase the buy size if estimated leftover funds stay above the user's reserve.
8. If the trade is already past the max size, optionally use `post_max_reinvest_ratio` instead.

The difficult part is step 6. If several sells settle at once, each one may want to pull extra quote funds into its next buy. The code tries to add up the value of all pending sell-to-buy flips in the current `processOrders()` batch so the third flip does not spend funds already claimed by the first two.

Known risk: this is still only a local estimate. The available funds snapshot can be stale, Coinbase can settle another order mid-loop, and the user can deposit or withdraw while the loop is running. Ratios above 100% deliberately consume idle funds, so a small stale-balance error can produce an insufficient-funds failure. The current practical mitigation is to keep a reserve/padding amount in the account.

This behavior is useful, but it should not be heavily refactored until the database and sync tests are stronger.

## Websocket Updates

The Coinbase websocket can catch order fills faster than REST polling. When it receives filled order updates, it calls a websocket-local `updateMultipleOrders()` implementation to fetch and update those order rows.

The websocket payload is treated as an early settlement signal, not a complete settlement record. Coinbot still calls the REST `getOrder` endpoint before updating the local order because the websocket event has historically omitted information needed by the flip and profit paths. The processing loop remains responsible for flipping settled rows.

This can reduce detection latency, but it duplicates part of the main-loop reconciliation path and does not remove the need for REST polling. Websockets can disconnect, miss data during restarts, or be unavailable when credentials are missing. Before expanding this path, measure whether its latency benefit is meaningful enough to justify maintaining two settlement detectors. A future simplification could have the websocket enqueue order IDs for the main reconciliation code instead of maintaining a second `updateMultipleOrders()` implementation.

## Sync/Desync Latency

On quick-sync iterations, `quickSync()` is followed by `deSync()`. The current desync query checks every active product on both sides for orders outside the user's Coinbase sync window. Cache hits make this cheap during stable periods, but an order mutation invalidates the cache and the next calculation can issue two queries per active product before Coinbase cancellation work begins.

During rapid price movement, this reconciliation and cancellation work can delay later order checks. Improving this path is likely more valuable than making websocket settlement handling more elaborate.

Future work should:

- instrument time spent in `quickSync`, `deSync`, Coinbase cancellation, and `updateMultipleOrders` separately;
- replace per-product desync reads with one set-based query while preserving per-product limits;
- avoid repeating desync work when the local order window has not changed;
- test whether settlement checks should run before, after, or concurrently with desync work without changing reservation or reorder semantics;
- keep Coinbase rate limits and per-user request ordering explicit.

## Known Sync Risks

- An order can settle between any two Coinbase API calls.
- A balance can change between `getAllAccounts()` and order reconciliation.
- Coinbase may return an order through one portfolio/API context and not another.
- A local order may represent an order that exists in a different Coinbase portfolio.
- `/accounts` available/hold data may not expose the portfolio reservation that `portfolio breakdown` reports through `available_to_trade_*`.
- Fee reservation differs between post-only maker orders and normal non-post-only limit orders.
- A replacement order can be placed successfully, then fail the immediate follow-up detail lookup.
- User deposits and withdrawals are external events that the bot only notices during later balance refreshes.
- Manual Coinbase trading can produce Coinbase orders the bot did not create.
- Reinvestment above 100% intentionally spends idle funds and is sensitive to stale available-funds snapshots.
- Runtime state is process-local and rebuilt on restart.

## Cleanup Targets

This area should be revisited after database bootstrap and migration work is stable.

Useful next improvements:

- Add a no-trade startup mode for repeatable smoke tests.
- Make the sync loop state machine explicit and tested.
- Add tests for `fullSync`, `quickSync`, `updateMultipleOrders`, and `reorder` with mocked Coinbase responses.
- Add timing metrics and focused tests around sync/desync behavior during bursts of fills and price movement.
- Consolidate websocket and main-loop settlement reconciliation if the websocket path does not provide a meaningful measured latency improvement.
- Add explicit portfolio awareness once Coinbase portfolio IDs are available through the API paths used here.
- Record enough local ledger events to explain why funds were considered available at the moment an order was placed.
- Add focused tests around reinvestment, reserves, max-trade behavior, and multiple simultaneous sell-to-buy flips.
- Make fee-reservation policy explicit per order type, especially post-only versus non-post-only limit BUY orders.
- Consider transactional or lock-like handling around local order replacement decisions.
- Separate read-only reconciliation from order-placing mutation steps.
