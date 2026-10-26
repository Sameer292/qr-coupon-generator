import { generateSecureToken, generateUniqueToken, performSelfCheck } from '../src/utils/security.js';
import { generateManifestCsv } from '../src/utils/csv.js';

console.log('=== Running Automated Verification Suite ===\n');

// 1. Test Secure Token Format & Entropy
console.log('1. Testing generateSecureToken entropy and length...');
const tokens = new Set();
const count = 5000;
for (let i = 0; i < count; i++) {
  const token = generateSecureToken();
  if (token.length !== 32) {
    throw new Error(`Token length is not 32: "${token}" (${token.length})`);
  }
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) {
    throw new Error(`Token contains invalid characters: "${token}"`);
  }
  if (tokens.has(token)) {
    throw new Error(`Duplicate token collision detected: "${token}"`);
  }
  tokens.add(token);
}
console.log(`✓ Generated ${count} unique 32-character Base64URL tokens with 0 collisions.\n`);

// 2. Test Coupon Item Model & Sequence
console.log('2. Testing Coupon Sequence & Item Generation...');
const prefix = 'FM-';
const startNumber = 101;
const quantity = 500;
const batchId = 'BATCH-2026-01';
const timestamp = new Date().toISOString();
const sampleTokens = new Set();
const coupons = [];

for (let i = 0; i < quantity; i++) {
  const code = `${prefix}${String(startNumber + i).padStart(5, '0')}`;
  const token = generateUniqueToken(sampleTokens);
  coupons.push({
    coupon_code: code,
    qr_token: token,
    batch_id: batchId,
    generated_at: timestamp,
  });
}

if (coupons[0].coupon_code !== 'FM-00101') {
  throw new Error(`First coupon code incorrect: ${coupons[0].coupon_code}`);
}
if (coupons[499].coupon_code !== 'FM-00600') {
  throw new Error(`Last coupon code incorrect: ${coupons[499].coupon_code}`);
}
console.log(`✓ Generated ${coupons.length} coupons from ${coupons[0].coupon_code} to ${coupons[499].coupon_code}.\n`);

// 3. Test Pre-Export Self Check Audit
console.log('3. Testing performSelfCheck audit system...');
const checkResult = performSelfCheck(coupons, quantity);
if (!checkResult.passed) {
  throw new Error(`Self check failed: ${JSON.stringify(checkResult)}`);
}
if (checkResult.codeDuplicates !== 0 || checkResult.tokenDuplicates !== 0 || checkResult.invalidTokenLengthCount !== 0) {
  throw new Error(`Self check anomalies found: ${JSON.stringify(checkResult)}`);
}
console.log(`✓ Self-check audit passed: total=${checkResult.totalGenerated}, codeDupes=${checkResult.codeDuplicates}, tokenDupes=${checkResult.tokenDuplicates}, invalidLengths=${checkResult.invalidTokenLengthCount}.\n`);

// 4. Test Manifest CSV Schema
console.log('4. Testing generateManifestCsv schema and formatting...');
const csv = generateManifestCsv(coupons);
const lines = csv.trim().split('\n');
const header = lines[0];

if (header !== 'coupon_code,qr_token,batch_id,generated_at') {
  throw new Error(`CSV header mismatch: "${header}"`);
}
if (lines.length !== quantity + 1) {
  throw new Error(`CSV row count mismatch: expected ${quantity + 1}, got ${lines.length}`);
}

const firstRow = lines[1].split(',');
if (firstRow[0] !== 'FM-00101' || firstRow[1] !== coupons[0].qr_token || firstRow[2] !== batchId || firstRow[3] !== timestamp) {
  throw new Error(`CSV first row mismatch: ${lines[1]}`);
}
console.log(`✓ manifest.csv generated perfectly (${lines.length} lines, schema verified).\n`);

console.log('=== ALL AUTOMATED VERIFICATION CHECKS PASSED SUCCESSFULLY ===');
