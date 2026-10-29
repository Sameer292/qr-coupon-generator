import assert from 'node:assert/strict';
import {
  buildCashBatchSummary,
  buildCashCoupons,
  getTotalPrizeQuantity,
  getTotalPrizeValue,
  performCashSelfCheck,
} from '../src/utils/prizeAllocation.js';
import { validateCashConfig } from '../src/utils/cashValidation.js';
import { generateCashManifestCsv } from '../src/utils/cashCsv.js';
import { buildTokenUrl } from '../src/utils/qr.js';

console.log('=== Running Cash Prize Verification Suite ===\n');

const tiers = [
  { id: 'tier-100', amount: 100, quantity: 10 },
  { id: 'tier-500', amount: 500, quantity: 5 },
  { id: 'tier-1000', amount: 1000, quantity: 2 },
];

const config = {
  logoDataUrl: 'data:image/png;base64,AAAA',
  phoneNumber: '+977-9801234567',
  landlineNumber: '01-5912345',
  linktreeUrl: 'https://linktr.ee/freshmasala',
  claimBaseUrl: 'https://freshmasala.com.np/claim/',
  couponPrefix: 'FM-',
  startingNumber: 101,
  batchId: 'CASH-TEST',
  couponsPerPdf: 250,
  prizeTiers: tiers,
  includeLinktreeQr: false,
};

console.log('1. Validating cash configuration...');
assert.equal(validateCashConfig(config).isValid, true);
assert.equal(
  validateCashConfig({
    ...config,
    prizeTiers: [
      { id: 'a', amount: 100, quantity: 10 },
      { id: 'b', amount: 100, quantity: 5 },
    ],
  }).isValid,
  false
);
assert.equal(
  validateCashConfig({
    ...config,
    claimBaseUrl: 'not-a-url',
  }).isValid,
  false
);
assert.equal(
  validateCashConfig({
    ...config,
    prizeTiers: [
      { id: 'a', amount: 100, quantity: 20000 },
      { id: 'b', amount: 500, quantity: 1 },
    ],
  }).isValid,
  false
);
assert.equal(validateCashConfig({ ...config, startingNumber: 1.5 }).isValid, false);
assert.equal(validateCashConfig({ ...config, couponPrefix: 'FM ' }).isValid, false);
assert.equal(validateCashConfig({ ...config, couponPrefix: 'FM,' }).isValid, false);
assert.equal(validateCashConfig({ ...config, batchId: 'CASH/2026' }).isValid, false);
assert.equal(validateCashConfig({ ...config, batchId: 'A'.repeat(51) }).isValid, false);
assert.equal(
  validateCashConfig({
    ...config,
    couponPrefix: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    startingNumber: 99999,
    prizeTiers: [{ id: 'a', amount: 100, quantity: 1 }],
  }).isValid,
  false
);
console.log('✓ Valid, duplicate-tier, invalid-URL, unsafe-code, and over-limit configurations handled.\n');

console.log('2. Allocating grouped prize tiers...');
const total = getTotalPrizeQuantity(tiers);
const expectedValue = getTotalPrizeValue(tiers);
assert.equal(total, 17);
assert.equal(expectedValue, 5500);

const coupons = buildCashCoupons(config);
assert.equal(coupons.length, 17);
assert.equal(coupons[0].coupon_code, 'FM-00101');
assert.equal(coupons[9].coupon_code, 'FM-00110');
assert.equal(coupons[10].coupon_code, 'FM-00111');
assert.equal(coupons[16].coupon_code, 'FM-00117');
assert.deepEqual(
  coupons.map((coupon) => coupon.prize_amount),
  [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 500, 500, 500, 500, 500, 1000, 1000]
);
assert.equal(new Set(coupons.map((coupon) => coupon.coupon_code)).size, 17);
assert.equal(new Set(coupons.map((coupon) => coupon.qr_token)).size, 17);
assert.equal(new Set(coupons.map((coupon) => coupon.generated_at)).size, 1);
assert.ok(coupons.every((coupon) => /^[A-Za-z0-9_-]{32}$/.test(coupon.qr_token)));
console.log('✓ 17 coupons allocated in exact tier order with unique codes and tokens.\n');

console.log('3. Running cash self-check...');
const selfCheck = performCashSelfCheck(coupons, total, tiers);
assert.equal(selfCheck.passed, true);
assert.equal(selfCheck.totalGenerated, 17);
assert.equal(selfCheck.tierCountsMatch, true);
assert.equal(selfCheck.groupingValid, true);
assert.equal(selfCheck.totalValue, 5500);
assert.equal(selfCheck.expectedTotalValue, 5500);
assert.equal(selfCheck.codeDuplicates, 0);
assert.equal(selfCheck.tokenDuplicates, 0);
console.log('✓ Quantity, tier counts, grouping, tokens, and payout total verified.\n');

console.log('4. Building batch summary and manifest...');
const summary = buildCashBatchSummary(config, coupons, coupons[0].generated_at);
assert.equal(summary.total_coupons, 17);
assert.equal(summary.total_value, 5500);
assert.equal(summary.tiers[0].codeStart, 'FM-00101');
assert.equal(summary.tiers[0].codeEnd, 'FM-00110');
assert.equal(summary.tiers[1].codeStart, 'FM-00111');
assert.equal(summary.tiers[1].codeEnd, 'FM-00115');
assert.equal(summary.tiers[2].codeStart, 'FM-00116');
assert.equal(summary.tiers[2].codeEnd, 'FM-00117');
assert.equal(summary.tiers[2].totalValue, 2000);

const manifest = generateCashManifestCsv(coupons);
const lines = manifest.trim().split('\n');
assert.equal(
  lines[0],
  'coupon_code,qr_token,batch_id,prize_amount,currency,generated_at'
);
assert.equal(lines.length, 18);
assert.ok(lines[1].startsWith('FM-00101,'));
assert.ok(lines[1].includes(',CASH-TEST,100,NPR,'));
console.log('✓ Summary ranges and six-column manifest are correct.\n');

console.log('5. Rejecting tampered allocations...');
const wrongTier = coupons.map((coupon) => ({ ...coupon }));
wrongTier[0].prize_amount = 999;
assert.equal(performCashSelfCheck(wrongTier, total, tiers).passed, false);

const duplicateToken = coupons.map((coupon) => ({ ...coupon }));
duplicateToken[1].qr_token = duplicateToken[0].qr_token;
assert.equal(performCashSelfCheck(duplicateToken, total, tiers).passed, false);

const wrongOrder = coupons.map((coupon) => ({ ...coupon }));
const first = wrongOrder[0].prize_amount;
wrongOrder[0].prize_amount = wrongOrder[16].prize_amount;
wrongOrder[16].prize_amount = first;
assert.equal(performCashSelfCheck(wrongOrder, total, tiers).groupingValid, false);
console.log('✓ Tampered tier, duplicate token, and broken grouping are rejected.\n');

console.log('6. Building claim URLs without dropping query parameters...');
assert.equal(
  buildTokenUrl('https://example.com/claim/?campaign=cash', 'abc123'),
  'https://example.com/claim/?campaign=cash&t=abc123'
);
assert.equal(
  buildTokenUrl('https://example.com/claim/', 'abc123'),
  'https://example.com/claim/?t=abc123'
);
console.log('✓ Existing query parameters are preserved.\n');

console.log('=== Cash Prize Verification Suite Passed ===');
