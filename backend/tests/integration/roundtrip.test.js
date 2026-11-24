import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.js';
import { initializeDatabase, openDatabase } from '../../src/config/database.js';
import { configureFinanceRoutes } from '../../src/routes/finance.js';

const origin = 'http://127.0.0.1:5173';
const password = 'RemateCR-demo-2026!';

test('catálogo, sesión, simulación y seguimiento sobre PostgreSQL embebido', async (t) => {
  const db = await openDatabase({ dataDir: 'memory://' });
  t.after(() => db.close());
  await initializeDatabase(db, { demoData: true });
  await initializeDatabase(db, { demoData: true });

  const mailbox = [];
  const notices = [];
  const app = createApp({
    mailer: {
      sendRecovery: async (email, token) => { mailbox.push({ email, token }); },
      sendClosure: async (email, id) => { notices.push({ email, id }); },
    },
    db,
    config: {
      jwtSecret: 'solo-para-prueba-local-de-integracion-rematecr',
      workflowToken: 'token-para-la-prueba-local-de-alertas-12345',
      allowedOrigins: [origin],
    },
    configureRoutes: configureFinanceRoutes({ env: {} }),
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;

  async function request(path, { method = 'GET', body, cookie, allowedOrigin = origin } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        Origin: allowedOrigin,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { res, data: res.status === 204 ? undefined : await res.json() };
  }

  async function login(email, role) {
    const { res, data } = await request('/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(res.status, 200);
    assert.equal(data.user.role, role);
    assert.ok(!Object.hasOwn(data.user, 'password_hash'));
    const session = res.headers.get('set-cookie');
    assert.match(session, /HttpOnly/i);
    assert.match(session, /SameSite=Strict/i);
    return session.split(';')[0];
  }

  const health = await request('/health');
  assert.equal(health.res.status, 200);
  assert.deepEqual((await request('/capabilities')).data, { financeAgent: false, comparisonAgent: false, searchAgent: false });

  const catalog = (await request('/assets?category=vehicle')).data.items;
  assert.equal(catalog.length, 2);
  const [a, b] = ['Vehículo A', 'Vehículo B'].map((title) => catalog.find((item) => item.title === title));
  assert.deepEqual((await request('/assets?category=vehicle&maxPrice=4000000')).data.items.map(item => item.id), [a.id]);
  assert.equal((await request('/assets?maxPrice=0')).data.items.length, 0);
  assert.equal((await request('/assets?minPrice=5&maxPrice=4')).res.status, 422);
  assert.deepEqual([a.estimatedTotal, b.estimatedTotal], [5700000, 5400000]);
  assert.equal((await request('/assets?category=property')).data.items.length, 0);
  assert.equal((await request('/assets?search=' + encodeURIComponent('Vehículo B'))).data.items[0].id, b.id);
  const asset = (await request('/assets/' + a.id)).data.asset;
  const repairs = asset.costs.find(({ amount }) => amount === 1200000);
  assert.ok(repairs);

  const deniedOrigin = await request('/auth/login', {
    method: 'POST', body: { email: 'comprador@example.test', password }, allowedOrigin: 'https://invalid.example.test',
  });
  assert.equal(deniedOrigin.res.status, 403);
  assert.equal((await request('/auth/me')).res.status, 401);
  const buyer = await login('comprador@example.test', 'buyer');
  const secondBuyer = await login('comprador2@example.test', 'buyer');
  const admin = await login('admin@example.test', 'admin');
  const auditor = await login('auditor@example.test', 'auditor');
  await t.test('alertas según consentimiento, límite de precio, propietario y reintentos de n8n', async () => {
    const settings = { budget:4000000, categories:['vehicle'], alertsEnabled:true };
    const save = (cookie, body) => request('/preferences',{method:'PUT',cookie,body});
    assert.equal((await save(buyer,{ ...settings,budget:null })).res.status,422);
    assert.equal((await save(admin,settings)).res.status,403);
    assert.equal((await save(buyer,settings)).res.status,204);
    assert.deepEqual((await request('/preferences',{cookie:buyer})).data,settings);
    assert.equal((await save(secondBuyer,{ ...settings,alertsEnabled:false })).res.status,204);
    assert.equal((await request('/internal/workflows/alerts',{method:'POST',cookie:admin,body:{eventId:'e1'}})).res.status,401);
    async function run(eventId) {
      const res = await fetch(base+'/internal/workflows/alerts',{method:'POST',headers:{
        'Content-Type':'application/json',Authorization:'Bearer token-para-la-prueba-local-de-alertas-12345',
      },body:JSON.stringify({eventId})});
      return res.json();
    }
    assert.deepEqual(await run('n8n:1'),{created:1,replay:false});
    assert.deepEqual(await run('n8n:1'),{created:1,replay:true});
    assert.deepEqual(await run('n8n:2'),{created:0,replay:false});
    assert.deepEqual((await request('/alerts',{cookie:buyer})).data.items.map(item=>item.assetId),[a.id]);
    assert.equal((await request('/alerts',{cookie:secondBuyer})).data.items.length,0);
    const history = await request('/assets/'+a.id+'/prices');
    assert.deepEqual(history.data.items.map(row=>row.price),[4000000]);
  });

  await t.test('favoritos privados, repetibles y exclusivos del comprador', async () => {
    const path = '/favorites/' + a.id;
    assert.equal((await request('/favorites')).res.status, 401);
    assert.equal((await request(path, { method: 'PUT', cookie: admin })).res.status, 403);
    for (let i = 0; i < 2; i++) assert.equal((await request(path, { method: 'PUT', cookie: buyer })).data.saved, true);
    assert.deepEqual((await request('/favorites', { cookie: buyer })).data.items.map(item => item.id), [a.id]);
    assert.equal((await request(path, { cookie: secondBuyer })).data.saved, false);
    assert.equal((await request(path, { method: 'DELETE', cookie: secondBuyer })).data.saved, false);
    assert.equal((await request(path, { cookie: buyer })).data.saved, true);
    assert.equal((await request(path, { method: 'DELETE', cookie: buyer })).data.saved, false);
    assert.equal((await request('/favorites', { cookie: buyer })).data.items.length, 0);
  });

  const pair = { scenarios: [a,b].map(asset => ({ assetId: asset.id, costs: [] })) };
  const comparison = (cookie, body) => request('/agents/compare', { method: 'POST', cookie, body });
  assert.equal((await comparison(admin, pair)).res.status, 403);
  assert.equal((await comparison(buyer, { scenarios: [pair.scenarios[0],pair.scenarios[0]] })).res.status, 422);
  assert.equal((await comparison(buyer, pair)).res.status, 503);

  const simulate = (amount) => request('/simulations', {
    method: 'POST', cookie: buyer, body: { assetId: a.id, costs: [{ id: repairs.id, amount }] },
  });
  const unknown = await simulate(null);
  assert.equal(unknown.res.status, 200);
  assert.equal(unknown.data.subtotal, 4500000);
  assert.equal(unknown.data.total, null);
  assert.equal(unknown.data.missing.length, 1);
  const knownZero = await simulate(0);
  assert.equal(knownZero.data.total, 4500000);
  assert.deepEqual(knownZero.data.missing, []);
  const negative = await simulate(-1);
  assert.ok(negative.res.status >= 400 && negative.res.status < 500);

  const draft = { assetId: b.id, subject: 'Confirmar costos de demostración', comment: '', consent: true };
  const unconfirmed = await request('/crm/requests', { method: 'POST', cookie: buyer, body: { ...draft, consent: false } });
  assert.ok(unconfirmed.res.status >= 400 && unconfirmed.res.status < 500);
  const submitted = await request('/crm/requests', { method: 'POST', cookie: buyer, body: draft });
  assert.equal(submitted.res.status, 201);
  const path = '/crm/requests/' + submitted.data.request.id;
  assert.deepEqual(submitted.data.request.history.map((event) => event.stage), ['received']);
  assert.equal((await request(path, { cookie: secondBuyer })).res.status, 404);
  assert.equal((await request('/crm/requests', { cookie: auditor })).res.status, 403);
  const transition = (cookie) => request(path + '/stage', { method: 'PATCH', cookie, body: { stage: 'reviewing' } });
  assert.equal((await transition(buyer)).res.status, 403);
  assert.equal((await transition(admin)).res.status, 200);
  assert.equal((await transition(admin)).res.status, 200);
  const own = await request(path, { cookie: buyer });
  assert.deepEqual(own.data.request.history.map((event) => event.stage), ['received', 'reviewing']);
  assert.equal((await request('/crm/requests', { cookie: secondBuyer })).data.items.length, 0);
  const summary = await request('/audit/summary', { cookie: auditor });
  assert.equal(summary.res.status, 200);
  assert.equal(summary.data.requestsByStage.reviewing, 1);
  assert.equal(summary.data.totalRequests, 1);
  assert.equal(summary.data.totalTransitions, 2);
  assert.deepEqual(Object.keys(summary.data).sort(), ['requestsByStage', 'totalRequests', 'totalTransitions']);
  assert.equal((await request('/audit/summary', { cookie: buyer })).res.status, 403);

  assert.equal((await request('/auth/logout', { method: 'POST', cookie: buyer })).res.status, 204);
  assert.equal((await request('/auth/me', { cookie: buyer })).res.status, 401);

  await t.test('registro, rectificación, recuperación de un uso y solicitud de baja', async () => {
    const email = 'cuenta@example.test';
    const signup = { name: 'Cuenta de prueba', email, password, version: 'cuenta-v2', accepted: true, terms:'terminos-demo-v1',privacy:'privacidad-demo-v1' };
    const post = (path, body, cookie) => request('/auth/' + path, { method: 'POST', body, cookie });
    assert.equal((await post('register', { ...signup, role: 'admin' })).res.status, 422);
    assert.equal((await post('register', { ...signup, accepted: false })).res.status, 422);
    assert.equal((await post('register', signup)).res.status, 204);
    assert.equal((await post('register', { ...signup, email: email.toUpperCase(), name: 'Duplicado' })).res.status, 204);
    const cookie = await login(email, 'buyer');
    assert.deepEqual((await request('/auth/acceptances',{cookie})).data.items.map(row=>row.id),[signup.privacy,signup.terms]);
    const updated = await request('/auth/me', { method: 'PATCH', cookie, body: { name: 'Nombre corregido' } });
    assert.equal(updated.data.user.name, 'Nombre corregido');
    const unknown = await post('recover', { email: 'desconocido@example.test' });
    assert.equal(mailbox.length, 0);
    const known = await post('recover', { email });
    assert.equal(known.res.status, 202);
    assert.deepEqual(unknown.data, known.data);
    const old = mailbox[0].token;
    await post('recover', { email });
    const token = mailbox[1].token;
    const replacement = password + '-nuevo';
    assert.equal((await post('reset', { token: old, password: replacement })).res.status, 400);
    const attempts = await Promise.all([1,2].map(() => post('reset', { token, password: replacement })));
    assert.deepEqual(attempts.map(result => result.res.status).sort(), [204,400]);
    assert.equal((await request('/auth/me', { cookie })).res.status, 401);
    assert.equal((await post('login', { email,password })).res.status, 401);
    const signedIn = await post('login', { email, password: replacement });
    const newCookie = signedIn.res.headers.get('set-cookie').split(';')[0];
    const privateCase = await request('/crm/requests', { method: 'POST', cookie: newCookie, body: { ...draft, comment: 'Comentario privado de prueba' } });
    assert.equal(privateCase.res.status, 201);
    const before = (await request('/audit/summary', { cookie: auditor })).data;
    await post('recover', { email });
    assert.equal((await post('closure', { password, confirmed: true }, newCookie)).res.status, 403);
    const closure = await post('closure', { password: replacement, confirmed: true }, newCookie);
    assert.equal(closure.res.status, 201);
    assert.equal(closure.data.receipt.status, 'pending');
    assert.ok(closure.data.receipt.id);
    assert.equal((await request('/auth/closures', { cookie: secondBuyer })).res.status, 403);
    const pending = await request('/auth/closures', { cookie: admin });
    assert.equal(pending.data.items[0].id, closure.data.receipt.id);
    assert.equal((await request('/auth/me', { cookie: newCookie })).res.status, 401);
    assert.equal((await post('reset', { token: mailbox[2].token, password })).res.status, 400);
    assert.equal((await post('login', { email, password: replacement })).res.status, 401);
    const folio = closure.data.receipt.id;
    const approve = '/auth/closures/' + folio + '/approve';
    assert.equal((await request(approve, { method: 'POST', cookie: secondBuyer })).res.status, 403);
    for (let attempt = 0; attempt < 2; attempt++) {
      assert.equal((await request(approve, { method: 'POST', cookie: admin })).data.receipt.status, 'completed');
    }
    assert.equal((await post('closure-status', { id: folio })).data.receipt.status, 'completed');
    assert.deepEqual(notices, [{ email, id: folio }]);
    assert.deepEqual((await request('/audit/summary', { cookie: auditor })).data, before);
    assert.equal((await request('/crm/requests/' + privateCase.data.request.id, { cookie: admin })).res.status, 404);
    assert.equal((await db.query('SELECT id FROM users WHERE email=$1', [email])).rows.length, 0);
    assert.equal((await db.query('SELECT user_id FROM closure_requests WHERE id=$1', [folio])).rows[0].user_id, null);
  });
});
