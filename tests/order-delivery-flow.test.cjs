const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(path, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('exports', 'require', code)(exports, key => {
    if (!(key in mocks)) throw new Error(`Unexpected import ${key}`);
    return mocks[key];
  });
  return exports;
}
const response = { NextResponse: { json: (data, options = {}) => ({ data, status: options.status || 200 }) } };
const admin = { requireAdminSection: async () => ({ id: 1 }) };
const notifications = { '@/lib/sms': { sendOrderStatusSms: async () => {} }, '@/lib/mail': { sendOrderEmail: async () => {} } };

test('all three sources enter pending and accepted orders move to delivering without a courier booking', async () => {
  const rows = ['pending', 'shipped', 'delivered'].map(status => ({ order_ref: status, status, total: '100', amount: '100', created_at: '2026-09-22', koombiyo_status: null }));
  const pos = ['pending', 'out_for_delivery', 'delivered'].map(delivery_status => ({ receipt_number: delivery_status, status: 'completed', delivery_status, fulfillment_type: 'delivery', total: '100', created_at: '2026-09-22' }));
  const api = load('src/app/api/admin/orders/route.ts', {
    'next/server': response, '@/lib/admin': admin, ...notifications,
    '@/lib/db': { query: async sql => sql.includes('FROM pos_sales') ? pos : rows },
  });
  for (const [view, expected] of [['pending', 'pending'], ['delivering', 'shipped'], ['completed', 'delivered']]) {
    const result = await api.GET(new Request(`https://example.test/orders?view=${view}`));
    assert.equal(result.status, 200);
    assert.equal(result.data.orders.length, 3);
    for (const order of result.data.orders) {
      assert.equal(order.type === 'pos' ? order.deliveryStatus : order.status, order.type === 'pos' && expected === 'shipped' ? 'out_for_delivery' : expected);
    }
  }
});

test('legacy accept request saves shipped and manual completion cannot credit profit', async () => {
  const writes = [];
  const api = load('src/app/api/admin/orders/route.ts', {
    'next/server': response, '@/lib/admin': admin, ...notifications,
    '@/lib/db': { query: async (sql, params) => {
      if (sql.startsWith('SELECT')) return [{ phone: null, status: 'pending' }];
      writes.push({ sql, params }); return { affectedRows: 1 };
    } },
  });
  const accept = await api.PATCH({ json: async () => ({ type: 'customer', orderRef: 'TEST', status: 'confirmed' }) });
  assert.equal(accept.status, 200);
  assert.equal(writes[0].params[0], 'shipped');
  for (const type of ['customer', 'reseller']) for (const status of ['completed', 'delivered']) {
    assert.equal((await api.PATCH({ json: async () => ({ type, orderRef: 'TEST', status }) })).status, 409);
  }
  assert.equal(writes.length, 1);
});

for (const courierStatus of ['Booked', 'Pending', 'In transit', 'Delivered', 'Returned']) {
  test(`courier ${courierStatus}: only delivery completion makes an order earned`, async () => {
    const updates = [];
    const koombiyo = load('src/lib/koombiyo.ts', { 'server-only': {} });
    const api = load('src/lib/courier-sync.ts', {
      'server-only': {}, ...notifications,
      '@/lib/koombiyo': { mapKoombiyoStatus: koombiyo.mapKoombiyoStatus, trackOrder: async () => ({ status: courierStatus, raw: {} }) },
      '@/lib/db': { query: async (sql, params) => {
        if (sql.includes('GET_LOCK')) return [{ acquired: 1 }];
        if (sql.includes('RELEASE_LOCK')) return [];
        if (sql.trim().startsWith('SELECT')) {
          assert.match(sql, /koombiyo_status IS NOT NULL/);
          return [{ order_ref: 'TEST', receipt_number: 'TEST', status: 'shipped', delivery_status: 'out_for_delivery', koombiyo_status: 'Booked', koombiyo_waybill_id: '123', total: '100' }];
        }
        updates.push({ sql, params }); return [];
      } },
    });
    const result = await api.syncCourierUpdates();
    assert.equal(result.failed, 0);
    assert.equal(result.synced, 3);
    for (const update of updates) {
      const expected = courierStatus === 'Delivered' ? 'delivered' : courierStatus === 'Returned' ? 'returned' : update.sql.includes('UPDATE pos_sales') ? 'out_for_delivery' : 'shipped';
      assert.equal(update.params[2], expected);
    }
  });
}

for (const report of ['overview', 'profit-loss', 'item', 'lost-profit']) {
  test(`${report} excludes pending, in-flight and returned deliveries from earned sales`, async () => {
    let checked = 0;
    const api = load(`src/app/api/admin/reports/${report}/route.ts`, {
      'next/server': response, '@/lib/admin': admin,
      '@/lib/report-costs': { estimateUnitCost: () => 0 },
      '@/lib/shipping': { computeDeliveryFee: () => 0, getDeliveryPricing: async () => ({}) },
      '@/lib/db': { query: async sql => {
        if (sql.includes("s.status = 'completed'")) {
          assert.match(sql, /COALESCE\(s.fulfillment_type, 'pickup'\) <> 'delivery' OR s.delivery_status = 'delivered'/);
          checked++;
        }
        if (sql.includes('FROM pos_sales') && sql.includes("AND status = 'completed'")) {
          assert.match(sql, /COALESCE\(fulfillment_type, 'pickup'\) <> 'delivery' OR delivery_status = 'delivered'/);
          checked++;
        }
        assert.doesNotMatch(sql, /status IN \('completed','delivered'\)/);
        return [];
      } },
    });
    const result = await api.GET(new Request('https://example.test/report?start=2026-09-01&end=2026-09-22&slug=test'));
    assert.equal(result.status, 200);
    assert.ok(checked > 0);
  });
}
