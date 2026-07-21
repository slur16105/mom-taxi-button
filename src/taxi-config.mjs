export function normalizePlace(place) {
  return {
    label: String(place?.label ?? '').trim(),
    address: String(place?.address ?? '').trim(),
  };
}

function requirePlace(place, kind) {
  const normalized = normalizePlace(place);
  if (!normalized.label || !normalized.address) {
    throw new Error(`${kind}의 이름과 주소를 모두 입력해 주세요.`);
  }
  return normalized;
}

export function buildTaxiBrief(pickup, destination) {
  const safePickup = requirePlace(pickup, '출발지');
  const safeDestination = requirePlace(destination, '목적지');
  const pickupText = `출발지: ${safePickup.label} — ${safePickup.address}`;
  const destinationText = `목적지: ${safeDestination.label} — ${safeDestination.address}`;

  return {
    pickupText,
    destinationText,
    fullText: `${pickupText}\n${destinationText}`,
  };
}

export function buildHelpMessage(pickup, destination) {
  const brief = buildTaxiBrief(pickup, destination);
  return `택시 호출 도움이 필요해요.\n${brief.fullText}\n가능하면 대신 호출해 주세요.`;
}

export function getKakaoTFallbackUrl() {
  return 'market://details?id=com.kakao.taxi';
}

export function getInstallMode(userAgent = '') {
  return /iPhone|iPad|iPod/i.test(userAgent) ? 'ios-guide' : 'browser-prompt';
}

export function getKakaoTLaunchPlan(userAgent = '') {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return { type: 'manual' };
  return {
    type: 'android-intent',
    url: 'intent://open/#Intent;scheme=kakaot;package=com.kakao.taxi;end',
  };
}
