// Token Radar's model in the page: the same arithmetic main.ts runs, in plain JavaScript.
//
// impliedOf(row, model) recomputes a row from the snapshot figures the row carries (TVL, the
// category multiple the market gave it, seven-day growth, age, chain count) and must land on the
// implied value board.json carries; farmSteps(row) regenerates the row's farm plan from its
// category, chains, TVL, age and seven-day growth. No protocol name is special-cased anywhere.
// Exposed as window.RadarModel so the page and any check can call the same functions.
(function () {
  'use strict';

  function clampGrowth(change7d, model) {
    var raw = (change7d === null || change7d === undefined || !isFinite(change7d)) ? 0 : change7d;
    return Math.min(model.growth_cap, Math.max(model.growth_floor, raw));
  }

  // implied = round(tvl x category_multiple x growthMult x maturityMult x breadthMult)
  function impliedOf(row, model) {
    var growth = clampGrowth(row.change_7d, model);
    var growthMult = 1 + (growth / 100) * model.growth_weight;
    var age = (row.age_days === null || row.age_days === undefined) ? model.unknown_age_days : row.age_days;
    var maturity = model.maturity_floor + (Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
    var chains = (row.chains && row.chains.length) || 0;
    var breadth = 1 + model.breadth_step * Math.min(Math.max(chains - 1, 0), model.breadth_max_chains);
    return Math.max(1, Math.round(row.tvl_usd * row.category_multiple * growthMult * maturity * breadth));
  }

  // The same implied value with one input changed, for the model sandbox: pass overrides
  // { growth_weight, multiple } and the row is rescored with them, everything else untouched.
  function impliedWith(row, model, overrides) {
    var m = {};
    Object.keys(model).forEach(function (k) { m[k] = model[k]; });
    if (overrides) Object.keys(overrides).forEach(function (k) { m[k] = overrides[k]; });
    var r = {};
    Object.keys(row).forEach(function (k) { r[k] = row[k]; });
    if (overrides && overrides.multiple !== undefined) r.category_multiple = overrides.multiple;
    return impliedOf(r, m);
  }

  function chainOf(p) { return (p.chains && p.chains.length > 0) ? p.chains[0] : 'its main chain'; }

  function capitalFor(p) {
    if (p.tvl_usd >= 5e9) return 250;
    if (p.tvl_usd >= 1e9) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }

  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }

  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' and keep the position open.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('yield aggregator') >= 0 || c.indexOf('yield') >= 0) return 'Deposit $' + capital + " of USDC into " + name + "'s highest-TVL vault on " + chain + ' and keep the shares.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('basis') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' on ' + name + ' and place one small market position.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + capital + " of the protocol's yield asset on " + chain + ' and hold it.';
    if (c.indexOf('restak') >= 0 || c.indexOf('staking pool') >= 0) return 'Stake $' + capital + " of the chain's staking asset through " + name + ' and keep the receipt token.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    if (c.indexOf('index') >= 0) return 'Buy $' + capital + ' of the ' + name + ' index on ' + chain + ' and hold it.';
    if (c.indexOf('payment') >= 0 || c.indexOf('card') >= 0) return 'Spend $' + capital + ' through ' + name + ' on ' + chain + ' and keep the receipt.';
    if (c.indexOf('farm') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + "'s farm on " + chain + ' and keep the position open.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }

  function secondActionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Borrow $20 against the supply on ' + name + ', repay it the same week, and keep the supply open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Swap $20 through ' + name + ' on ' + chain + ' and add the proceeds to the same pool.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return "Vote once in " + name + "'s governance or reallocate $20 between its vaults on " + chain + '.';
    if (c.indexOf('yield') >= 0) return "Claim the vault's yield once and redeposit it into the same " + name + ' vault.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('basis') >= 0) return 'Close the hedge on ' + name + ' and open one fresh small position the following week.';
    if (c.indexOf('prediction') >= 0) return 'Settle one position on ' + name + ' and place one fresh market position.';
    if (c.indexOf('stable') >= 0) return 'Swap $20 of the stable asset back through ' + name + ' and re-mint it.';
    if (c.indexOf('rwa') >= 0) return "Check the " + name + " asset's redemption page and redeem $20, then re-mint it.";
    if (c.indexOf('restak') >= 0 || c.indexOf('staking pool') >= 0) return 'Claim the staking rewards on ' + name + ' once and restake them.';
    if (c.indexOf('insurance') >= 0) return 'Review the cover terms on ' + name + ' and file one test claim check if the app offers one.';
    if (c.indexOf('index') >= 0) return 'Rebalance $20 of the ' + name + ' index position when its weights change.';
    if (c.indexOf('payment') >= 0 || c.indexOf('card') >= 0) return 'Make a second $20 spend through ' + name + ' on a different day.';
    if (c.indexOf('farm') >= 0) return 'Harvest the farm rewards on ' + name + ' once and redeposit them.';
    return 'Make one $20 swap or deposit through ' + name + ' on ' + chain + ' as a second touchpoint.';
  }

  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + " Hold the position and check the protocol's own page.";
    return s;
  }

  // Eight steps, each an action with a cost and a time, from the row's own record.
  function farmSteps(p) {
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    var growth = (p.change_7d === null || p.change_7d === undefined)
      ? 'unreported'
      : ((p.change_7d >= 0 ? '+' : '') + p.change_7d.toFixed(2) + '%');
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, fund it with $' + capital + ' of USDC plus $5 of gas on ' + chain + ', and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas', time: '15 minutes to set up' },
      { text: secondActionFor(p, capital, chain), cost: 'about $20 of capital moved and $2 of gas', time: '10 minutes' },
      { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote, and never leave the position empty for a full week.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: "Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.", cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Check the risk before you add more: ' + p.name + ' moved ' + growth + ' in TVL over the last 7 days, so size the position at $' + capital + ' only and never borrow to farm it.', cost: 'nothing to check', time: '5 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log, and unwind in reverse: claim first, then withdraw the $' + capital + ', then close the wallet\'s approvals.', cost: 'nothing but the log', time: '10 minutes to unwind' }
    ].map(stepText);
  }

  window.RadarModel = {
    impliedOf: impliedOf,
    impliedWith: impliedWith,
    farmSteps: farmSteps,
    capitalFor: capitalFor,
    holdDaysFor: holdDaysFor,
    chainOf: chainOf
  };
})();
