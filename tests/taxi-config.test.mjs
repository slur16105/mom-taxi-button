import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePlace,
  buildTaxiBrief,
  buildHelpMessage,
  getKakaoTFallbackUrl,
} from '../src/taxi-config.mjs';

test('normalizePlace trims required address fields', () => {
  assert.deepEqual(
    normalizePlace({ label: ' 병원 ', address: ' 서울시 강남구 병원로 1 ' }),
    { label: '병원', address: '서울시 강남구 병원로 1' },
  );
});

test('buildTaxiBrief creates copy-ready pickup and destination text', () => {
  const brief = buildTaxiBrief(
    { label: '우리 집 앞', address: '서울시 서초구 예시로 10, 정문' },
    { label: '단골 병원', address: '서울시 강남구 병원로 1' },
  );

  assert.equal(brief.pickupText, '출발지: 우리 집 앞 — 서울시 서초구 예시로 10, 정문');
  assert.equal(brief.destinationText, '목적지: 단골 병원 — 서울시 강남구 병원로 1');
  assert.match(brief.fullText, /출발지:/);
  assert.match(brief.fullText, /목적지:/);
});

test('buildHelpMessage includes the requested destination and copyable pickup', () => {
  const message = buildHelpMessage(
    { label: '우리 집 앞', address: '서울시 서초구 예시로 10, 정문' },
    { label: '단골 병원', address: '서울시 강남구 병원로 1' },
  );

  assert.match(message, /택시 호출 도움이 필요해요/);
  assert.match(message, /단골 병원/);
  assert.match(message, /서울시 서초구 예시로 10/);
});

test('getKakaoTFallbackUrl uses the Kakao T Play Store listing', () => {
  assert.equal(
    getKakaoTFallbackUrl(),
    'market://details?id=com.kakao.taxi',
  );
});
