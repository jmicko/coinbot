import { pool } from '../server/modules/pool.js';
import { Coinbase } from '../server/modules/coinbaseClient.js';

const userID = Number(process.env.COINBOT_HOLD_TEST_USER_ID || 1);
const productID = process.env.COINBOT_HOLD_TEST_PRODUCT || 'ETH-USD';
const targetNotional = Number(process.env.COINBOT_HOLD_TEST_NOTIONAL || 20);
const priceRatio = Number(process.env.COINBOT_HOLD_TEST_PRICE_RATIO || 0.5);
const maxNotional = Number(process.env.COINBOT_HOLD_TEST_MAX_NOTIONAL || 50);
const shouldCancel = process.env.COINBOT_HOLD_TEST_CANCEL !== 'false';
const waitAfterPlaceMs = Number(process.env.COINBOT_HOLD_TEST_WAIT_AFTER_PLACE_MS || 7000);
const postOnly = process.env.COINBOT_HOLD_TEST_POST_ONLY !== 'false';

if (!Number.isFinite(targetNotional) || targetNotional <= 0) {
  throw new Error('COINBOT_HOLD_TEST_NOTIONAL must be a positive number.');
}

if (targetNotional > maxNotional) {
  throw new Error(`Refusing to place a test order above ${maxNotional}. Set COINBOT_HOLD_TEST_MAX_NOTIONAL to override.`);
}

if (!Number.isFinite(priceRatio) || priceRatio <= 0 || priceRatio >= 1) {
  throw new Error('COINBOT_HOLD_TEST_PRICE_RATIO must be greater than 0 and less than 1.');
}

if (!Number.isFinite(waitAfterPlaceMs) || waitAfterPlaceMs < 0) {
  throw new Error('COINBOT_HOLD_TEST_WAIT_AFTER_PLACE_MS must be a non-negative number.');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function numberFromCoinbaseValue(value) {
  if (value == null) return 0;
  if (typeof value === 'object' && 'value' in value) return Number(value.value || 0);
  return Number(value || 0);
}

function decimalPlaces(increment) {
  const text = String(increment);
  if (!text.includes('.')) return 0;
  return text.replace(/0+$/, '').split('.')[1]?.length || 0;
}

function floorToIncrement(value, increment, places) {
  const numericIncrement = Number(increment);
  const floored = Math.floor(value / numericIncrement) * numericIncrement;
  return floored.toFixed(places);
}

function accountSnapshot(accounts, currency) {
  const matchingAccounts = accounts.filter(item => item.currency === currency);
  const available = matchingAccounts.reduce((sum, account) => {
    return sum + Number(account?.available_balance?.value || 0);
  }, 0);
  const hold = matchingAccounts.reduce((sum, account) => {
    return sum + Number(account?.hold?.value || 0);
  }, 0);

  return {
    currency,
    available,
    hold,
    accounts: matchingAccounts.map(account => ({
      uuid: account.uuid,
      name: account.name,
      type: account.type,
      portfolioID: account.retail_portfolio_id,
      available: Number(account?.available_balance?.value || 0),
      hold: Number(account?.hold?.value || 0),
    })),
  };
}

function diffSnapshots(before, after) {
  const beforeAccounts = new Map(before.accounts.map(account => [account.uuid, account]));

  return {
    availableDelta: after.available - before.available,
    holdDelta: after.hold - before.hold,
    accountDeltas: after.accounts
      .map(account => {
        const previous = beforeAccounts.get(account.uuid) || {
          available: 0,
          hold: 0,
        };

        return {
          uuid: account.uuid,
          name: account.name,
          type: account.type,
          portfolioID: account.portfolioID,
          availableDelta: account.available - previous.available,
          holdDelta: account.hold - previous.hold,
        };
      })
      .filter(account => account.availableDelta || account.holdDelta),
  };
}

async function signedGet(client, path) {
  const options = client.signRequest(null, {
    url: `https://api.coinbase.com${path}`,
    path,
    method: 'GET',
  });

  const response = await fetch(options.url, {
    method: options.method,
    headers: options.headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GET ${path} failed with ${response.status}: ${text}`);
  }

  return response.json();
}

async function getPortfolioBreakdowns(client) {
  const portfoliosResult = await signedGet(client, '/api/v3/brokerage/portfolios');
  const portfolios = portfoliosResult.portfolios || [];
  const errors = [];

  const breakdowns = await Promise.all(portfolios.map(async portfolio => {
    try {
      const breakdown = await signedGet(client, `/api/v3/brokerage/portfolios/${portfolio.uuid}`);
      return {
        uuid: portfolio.uuid,
        name: portfolio.name,
        type: portfolio.type,
        breakdown: breakdown.breakdown,
      };
    } catch (error) {
      errors.push({
        uuid: portfolio.uuid,
        name: portfolio.name,
        type: portfolio.type,
        error: error?.response?.data || error.message,
      });
      return null;
    }
  }));

  return {
    breakdowns: breakdowns.filter(Boolean),
    errors,
  };
}

function portfolioCurrencySnapshot(portfolioBreakdowns, currency) {
  const positions = [];

  for (const portfolio of portfolioBreakdowns) {
    const spotPositions = portfolio.breakdown?.spot_positions || [];
    const matchingPositions = spotPositions.filter(position => position.asset === currency);

    for (const position of matchingPositions) {
      positions.push({
        portfolioUUID: portfolio.uuid,
        portfolioName: portfolio.name,
        portfolioType: portfolio.type,
        accountUUID: position.account_uuid,
        asset: position.asset,
        totalBalanceFiat: numberFromCoinbaseValue(position.total_balance_fiat),
        totalBalanceCrypto: numberFromCoinbaseValue(position.total_balance_crypto),
        availableToTradeFiat: numberFromCoinbaseValue(position.available_to_trade_fiat),
        availableToTradeCrypto: numberFromCoinbaseValue(position.available_to_trade_crypto),
        availableToTransferFiat: numberFromCoinbaseValue(position.available_to_transfer_fiat),
        availableToTransferCrypto: numberFromCoinbaseValue(position.available_to_transfer_crypto),
      });
    }
  }

  return {
    currency,
    totalBalanceFiat: positions.reduce((sum, position) => sum + position.totalBalanceFiat, 0),
    totalBalanceCrypto: positions.reduce((sum, position) => sum + position.totalBalanceCrypto, 0),
    availableToTradeFiat: positions.reduce((sum, position) => sum + position.availableToTradeFiat, 0),
    availableToTradeCrypto: positions.reduce((sum, position) => sum + position.availableToTradeCrypto, 0),
    availableToTransferFiat: positions.reduce((sum, position) => sum + position.availableToTransferFiat, 0),
    availableToTransferCrypto: positions.reduce((sum, position) => sum + position.availableToTransferCrypto, 0),
    positions,
  };
}

function diffPortfolioSnapshots(before, after) {
  const beforePositions = new Map(before.positions.map(position => {
    return [`${position.portfolioUUID}:${position.accountUUID}:${position.asset}`, position];
  }));

  return {
    totalBalanceFiatDelta: after.totalBalanceFiat - before.totalBalanceFiat,
    totalBalanceCryptoDelta: after.totalBalanceCrypto - before.totalBalanceCrypto,
    availableToTradeFiatDelta: after.availableToTradeFiat - before.availableToTradeFiat,
    availableToTradeCryptoDelta: after.availableToTradeCrypto - before.availableToTradeCrypto,
    availableToTransferFiatDelta: after.availableToTransferFiat - before.availableToTransferFiat,
    availableToTransferCryptoDelta: after.availableToTransferCrypto - before.availableToTransferCrypto,
    positionDeltas: after.positions
      .map(position => {
        const previous = beforePositions.get(`${position.portfolioUUID}:${position.accountUUID}:${position.asset}`) || {
          totalBalanceFiat: 0,
          totalBalanceCrypto: 0,
          availableToTradeFiat: 0,
          availableToTradeCrypto: 0,
          availableToTransferFiat: 0,
          availableToTransferCrypto: 0,
        };

        return {
          portfolioUUID: position.portfolioUUID,
          portfolioName: position.portfolioName,
          accountUUID: position.accountUUID,
          asset: position.asset,
          totalBalanceFiatDelta: position.totalBalanceFiat - previous.totalBalanceFiat,
          totalBalanceCryptoDelta: position.totalBalanceCrypto - previous.totalBalanceCrypto,
          availableToTradeFiatDelta: position.availableToTradeFiat - previous.availableToTradeFiat,
          availableToTradeCryptoDelta: position.availableToTradeCrypto - previous.availableToTradeCrypto,
          availableToTransferFiatDelta: position.availableToTransferFiat - previous.availableToTransferFiat,
          availableToTransferCryptoDelta: position.availableToTransferCrypto - previous.availableToTransferCrypto,
        };
      })
      .filter(position => {
        return position.totalBalanceFiatDelta
          || position.totalBalanceCryptoDelta
          || position.availableToTradeFiatDelta
          || position.availableToTradeCryptoDelta
          || position.availableToTransferFiatDelta
          || position.availableToTransferCryptoDelta;
      }),
  };
}

async function getOptionalPortfolioSnapshots(client, currencies) {
  try {
    const portfolioResult = await getPortfolioBreakdowns(client);
    return {
      portfolioCount: portfolioResult.breakdowns.length,
      portfolioErrors: portfolioResult.errors,
      snapshots: Object.fromEntries(
        currencies.map(currency => [currency, portfolioCurrencySnapshot(portfolioResult.breakdowns, currency)])
      ),
    };
  } catch (error) {
    return {
      error: error?.response?.data || error.message,
    };
  }
}

async function getVisibleOrder(client, orderID) {
  let lastError;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      return await client.getOrder(orderID);
    } catch (error) {
      lastError = error;
      await sleep(1000);
    }
  }
  throw lastError;
}

async function getCredentials() {
  const result = await pool.query('SELECT * FROM "user_api" WHERE "userID" = $1;', [userID]);
  const api = result.rows[0];
  if (!api?.name || !api?.privateKey) {
    throw new Error(`User ${userID} does not have Coinbase Advanced Trade API credentials in the local database.`);
  }
  return api;
}

async function getAccountsByCurrency(client, currencies) {
  const accountsResult = await client.getAllAccounts();
  return Object.fromEntries(
    currencies.map(currency => [currency, accountSnapshot(accountsResult.accounts, currency)])
  );
}

let client;
let orderID;

try {
  const api = await getCredentials();
  client = new Coinbase(api.CB_ACCESS_KEY, api.CB_SECRET, api);

  const [product, fees] = await Promise.all([
    client.getProduct(productID),
    client.getTransactionSummary({ user_native_currency: 'USD' }),
  ]);

  const baseCurrency = product.base_currency_id;
  const quoteCurrency = product.quote_currency_id;
  const currentPrice = Number(product.price || product.mid_market_price);
  const quotePlaces = decimalPlaces(product.quote_increment);
  const basePlaces = decimalPlaces(product.base_increment);
  const limitPrice = floorToIncrement(currentPrice * priceRatio, product.quote_increment, quotePlaces);
  const baseSize = floorToIncrement(targetNotional / Number(limitPrice), product.base_increment, basePlaces);
  const actualNotional = Number(limitPrice) * Number(baseSize);

  if (actualNotional < Number(product.quote_min_size || 0)) {
    throw new Error(`Calculated notional ${actualNotional} is below quote_min_size ${product.quote_min_size}.`);
  }

  const currencies = [quoteCurrency, baseCurrency];
  const before = await getAccountsByCurrency(client, currencies);
  const beforePortfolios = await getOptionalPortfolioSnapshots(client, currencies);

  const placed = await client.placeOrder({
    side: 'BUY',
    product_id: productID,
    base_size: baseSize,
    limit_price: limitPrice,
    post_only: postOnly,
  });

  if (!placed.success) {
    throw new Error(`Coinbase did not accept the order: ${JSON.stringify(placed)}`);
  }

  orderID = placed.success_response.order_id;
  const visibleOrder = await getVisibleOrder(client, orderID);
  await sleep(waitAfterPlaceMs);
  const afterPlace = await getAccountsByCurrency(client, currencies);
  const afterPlacePortfolios = await getOptionalPortfolioSnapshots(client, currencies);

  let afterCancel = null;
  let cancelResult = null;
  if (shouldCancel) {
    cancelResult = await client.cancelOrders([orderID]);
    await sleep(4000);
    afterCancel = await getAccountsByCurrency(client, currencies);
  }

  const quotePlaceDiff = diffSnapshots(before[quoteCurrency], afterPlace[quoteCurrency]);
  const basePlaceDiff = diffSnapshots(before[baseCurrency], afterPlace[baseCurrency]);
  const makerFeeRate = Number(fees.fee_tier?.maker_fee_rate || 0);
  const takerFeeRate = Number(fees.fee_tier?.taker_fee_rate || 0);

  console.log(JSON.stringify({
    userID,
    productID,
    product: {
      baseCurrency,
      quoteCurrency,
      currentPrice,
      quoteIncrement: product.quote_increment,
      baseIncrement: product.base_increment,
    },
    fees: {
      makerFeeRate,
      takerFeeRate,
      makerFeeEstimate: actualNotional * makerFeeRate,
      takerFeeEstimate: actualNotional * takerFeeRate,
    },
    order: {
      orderID,
      postOnly,
      limitPrice: Number(limitPrice),
      baseSize: Number(baseSize),
      actualNotional,
      status: visibleOrder.order?.status,
      totalFees: visibleOrder.order?.total_fees,
      totalValueAfterFees: visibleOrder.order?.total_value_after_fees,
      sizeInclusiveOfFees: visibleOrder.order?.size_inclusive_of_fees,
    },
    quoteCurrencyHoldChange: quotePlaceDiff,
    baseCurrencyHoldChange: basePlaceDiff,
    portfolioAvailableChange: beforePortfolios.error || afterPlacePortfolios.error
      ? {
        beforeError: beforePortfolios.error,
        afterPlaceError: afterPlacePortfolios.error,
      }
      : {
        portfolioCount: beforePortfolios.portfolioCount,
        portfolioErrors: beforePortfolios.portfolioErrors,
        [quoteCurrency]: diffPortfolioSnapshots(
          beforePortfolios.snapshots[quoteCurrency],
          afterPlacePortfolios.snapshots[quoteCurrency]
        ),
        [baseCurrency]: diffPortfolioSnapshots(
          beforePortfolios.snapshots[baseCurrency],
          afterPlacePortfolios.snapshots[baseCurrency]
        ),
      },
    afterCancel: afterCancel && {
      cancelResult,
      quoteCurrencyHoldChange: diffSnapshots(before[quoteCurrency], afterCancel[quoteCurrency]),
      baseCurrencyHoldChange: diffSnapshots(before[baseCurrency], afterCancel[baseCurrency]),
    },
  }, null, 2));
} catch (error) {
  if (orderID && shouldCancel && client) {
    try {
      await client.cancelOrders([orderID]);
    } catch (cancelError) {
      console.error('Failed to cancel test order after error:', cancelError?.response?.data || cancelError.message);
    }
  }

  console.error(error?.response?.data || error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
