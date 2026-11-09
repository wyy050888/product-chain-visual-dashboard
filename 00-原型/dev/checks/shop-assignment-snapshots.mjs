import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function verifyProjection() {
  const ctx = vm.createContext({});
  const source = name => fs.readFileSync(new URL('../../数智罗盘/shop-config-src/' + name, import.meta.url), 'utf8');
  vm.runInContext(source('goal-seed.js') + source('goal-snapshots.js') + ';globalThis.project=GoalAssignmentSnapshots.project;globalThis.seed=shopGoalSeed;', ctx);
  const original = Object.values(ctx.seed.product).find(row => row.shopId === 'konka');
  const row = { ...original, year: 2026, monthNumber: 1, strategy: '新策略', strategyId: '', promotion: '新推广', promotionId: '' };
  const op = (id, before, after, fields) => ({ id, status: 'success', timestamp: '2026-11-02T03:00:00Z', actor: '系统租户管理员', groups: [{ details: [{ type: 'updated', before, after, fields }] }] });
  const first = op('first', original, row, ['strategy', 'promotion']);
  const secondRow = { ...row, promotion: '再次分配' };
  const second = op('second', row, secondRow, ['promotion']);
  const money = op('money', secondRow, { ...secondRow, gsv: 99 }, ['gsv']);
  const state = { product: { one: row }, link: {}, operations: [first, second, money] };
  const projected = ctx.project(state), identity = '天猫|konka';
  assert.deepEqual([...projected.rows.get(identity).strategy], ['新策略']);
  assert.deepEqual([...projected.rows.get(identity).promotion], ['再次分配']);
  const changes = projected.records.filter(record => record.identity === identity && record.order >= 0);
  assert.equal(changes.length, 2, '金额修改不新增分配记录，按提交顺序读取最新快照');
  assert.equal(changes[1].before[0].promotion, '新推广');
  assert.equal(changes[0].after[0].promotion, '新推广', '后续修改不覆盖旧快照');
  assert.equal(ctx.project(state).records.length, projected.records.length, '刷新不重复生成记录');
  const duplicate = { ...first, groups: [...first.groups, ...first.groups] };
  assert.equal(ctx.project({ operations: [duplicate] }).records.filter(r => r.order >= 0).length, 1, '产品/链接同步同店铺只记一次');
}

export async function shopAssignmentSnapshots(page) {
  verifyProjection();
  const context = page.context(), base = new URL('数智罗盘/店铺配置.html', page.url()).href;
  const admin = await context.newPage(), target = await context.newPage(), errors = [];
  for (const tab of [admin, target]) tab.on('pageerror', error => errors.push(error.message));
  try {
    await target.goto(new URL('目标管理/目标管理.html', base).href);
    await target.waitForFunction(() => Boolean(window.GoalPrototype?.targetStore));
    await target.evaluate(() => { localStorage.removeItem('goal-prototype-targets-v1'); });
    await target.reload();
    await target.waitForFunction(() => Boolean(window.GoalPrototype?.targetStore));
    for (const [platform, channel] of [['tmall', '天猫'], ['jd', '京东'], ['pdd', '拼多多']]) {
      await admin.goto(base + '?platform=' + platform);
      await admin.locator('#shop-rows tr').first().waitFor();
      assert(await admin.locator('#records-open').isVisible());
      await admin.locator('#records-open').click();
      assert(await admin.locator('#record-promotion').isVisible());
      assert((await admin.locator('#record-rows .record-operation').allTextContents()).every(text => text === '新增'));
      assert((await admin.locator('#record-rows .record-action').evaluateAll(tags => tags.every(tag => tag.dataset.action === 'create'))));
      const initialCount = await admin.locator('#record-count').innerText();
      const update = async promotion => target.evaluate(({ channel, promotion }) => {
        const a = GoalPrototype, rows = a.targetStore.read('product', { year: 2026, monthNumber: 10, cid: '一类不含 CID' });
        const original = rows.find(row => row.channel === channel || a.fixtures.shops[row.shopId]?.channel === channel);
        if (!original) throw Error('平台没有目标样例：' + channel);
        const next = { ...original, strategy: '分配验证策略', strategyId: '', promotion, promotionId: '' };
        a.targetStore.updateProduct(original, next, a.targetStore.version());
        return { id: original.shopId, before: original.promotion };
      }, { channel, promotion });
      const first = await update('分配验证推广甲');
      await admin.waitForFunction(id => window.shopAdminAudit().shops.find(shop => shop.id === id)?.attribution.promotion.includes('分配验证推广甲'), first.id);
      await admin.locator('#record-shop').fill(first.id);
      assert.match(await admin.locator('#record-rows').innerText(), /分配验证推广甲/);
      assert.match(await admin.locator('#record-rows').innerText(), /系统租户管理员/);
      assert.equal(await admin.locator('#record-rows .record-operation').first().innerText(), '变更');
      assert((await admin.locator('#record-rows .record-operation').evaluateAll(cells => cells.every(cell => cell.children.length === 1 && cell.firstElementChild.matches('.record-action[data-action]')))), '操作列只保留一个标签');
      assert.equal(await admin.locator('#record-rows .record-action').first().getAttribute('data-action'), 'update');
      assert.doesNotMatch(await admin.locator('#record-rows').innerText(), /目标管理|初始快照|当前分配/);
      await update('分配验证推广乙');
      await admin.waitForFunction(id => window.shopAdminAudit().shops.find(shop => shop.id === id)?.attribution.promotion.includes('分配验证推广乙'), first.id);
      const changes = admin.locator('#record-rows tr[data-goal-record]:not([data-goal-record^="initial|"])');
      assert.equal(await changes.count(), 2);
      assert.match(await changes.first().innerText(), /分配验证推广甲[\s\S]*分配验证推广乙/);
      await admin.keyboard.press('Escape');
      await admin.reload();
      await admin.locator('#records-open').click();
      await admin.locator('#record-shop').fill(first.id);
      assert.equal(await changes.count(), 2, '刷新保留历史且不重复新增');
      await admin.locator('#record-promotion').fill('分配验证推广乙');
      assert.equal(await changes.count(), 1, '可以按分配前后推广负责人筛选');
      await admin.locator('#record-time-start').fill('2026-11-03');
      await admin.locator('#record-time-end').fill('2026-11-01');
      assert(await admin.locator('#record-time-error').isVisible());
      await admin.locator('#record-reset').click();
      assert.notEqual(await admin.locator('#record-count').innerText(), initialCount);
      for (const size of ['20', '50', '10']) await admin.locator('#record-page-size').selectOption(size);
      await admin.keyboard.press('Escape');
      await admin.locator('#shop-search').fill(first.id);
      const attribution = await admin.evaluate(id => window.shopAdminAudit().shops.find(shop => shop.id === id).attribution, first.id);
      assert.deepEqual(attribution.strategy, ['分配验证策略']);
      assert.deepEqual(attribution.promotion, ['分配验证推广乙']);
    }
    assert.deepEqual(errors, []);
  } finally { await admin.close(); await target.close(); }
}
