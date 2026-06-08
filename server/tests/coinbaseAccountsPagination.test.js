import assert from 'node:assert/strict';
import test from 'node:test';
import { Coinbase } from '../modules/coinbaseClient.js';

function createClientWithPages(pages) {
  const client = new Coinbase('', '', {
    name: 'test-key',
    privateKey: 'test-private-key',
  });
  const calls = [];

  client.getAccounts = async (params) => {
    calls.push(params);
    const page = pages.get(params.cursor || 'first');
    if (!page) {
      throw new Error(`unexpected cursor ${params.cursor}`);
    }
    return page;
  };

  return { calls, client };
}

test('getAllAccounts follows cursor pagination', async () => {
  const { calls, client } = createClientWithPages(new Map([
    ['first', {
      accounts: [{ currency: 'USD' }],
      cursor: 'page-2',
      has_next: true,
    }],
    ['page-2', {
      accounts: [{ currency: 'LTC' }, { currency: 'BTC' }],
      has_next: false,
    }],
  ]));

  const result = await client.getAllAccounts({
    limit: 2,
    pageDelayMs: 0,
  });

  assert.deepEqual(calls, [
    { limit: 2 },
    { limit: 2, cursor: 'page-2' },
  ]);
  assert.deepEqual(result.accounts, [
    { currency: 'USD' },
    { currency: 'LTC' },
    { currency: 'BTC' },
  ]);
  assert.equal(result.has_next, false);
  assert.equal(result.page_count, 2);
  assert.equal(result.num_accounts, 3);
});

test('getAllAccounts rejects repeated cursors instead of looping forever', async () => {
  const { client } = createClientWithPages(new Map([
    ['first', {
      accounts: [{ currency: 'USD' }],
      cursor: 'page-2',
      has_next: true,
    }],
    ['page-2', {
      accounts: [{ currency: 'LTC' }],
      cursor: 'page-2',
      has_next: true,
    }],
  ]));

  await assert.rejects(
    () => client.getAllAccounts({ pageDelayMs: 0 }),
    /invalid cursor/
  );
});

test('getAllAccounts validates account pages', async () => {
  const { client } = createClientWithPages(new Map([
    ['first', {
      has_next: false,
    }],
  ]));

  await assert.rejects(
    () => client.getAllAccounts({ pageDelayMs: 0 }),
    /accounts array/
  );
});

test('getAllAccounts stops after the configured page ceiling', async () => {
  const { client } = createClientWithPages(new Map([
    ['first', {
      accounts: [{ currency: 'USD' }],
      cursor: 'page-2',
      has_next: true,
    }],
  ]));

  await assert.rejects(
    () => client.getAllAccounts({
      maxPages: 1,
      pageDelayMs: 0,
    }),
    /exceeded 1 pages/
  );
});
