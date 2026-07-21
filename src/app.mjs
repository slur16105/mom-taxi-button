import { buildHelpMessage, buildTaxiBrief, normalizePlace, getKakaoTFallbackUrl } from './taxi-config.mjs';

const STORAGE_KEY = 'mom-taxi-button.settings.v1';
const DEFAULTS = {
  pickup: { label: '', address: '' },
  destinations: [
    { label: '병원', address: '' },
    { label: '시장', address: '' },
    { label: '다른 자주 가는 곳', address: '' },
  ],
  helpContact: '',
};

const elements = {
  placeList: document.querySelector('#place-list'),
  confirmDialog: document.querySelector('#confirm-dialog'),
  confirmTitle: document.querySelector('#confirm-title'),
  tripSummary: document.querySelector('#trip-summary'),
  startKakao: document.querySelector('#start-kakao-button'),
  settingsDialog: document.querySelector('#settings-dialog'),
  settingsForm: document.querySelector('#settings-form'),
  destinationFields: document.querySelector('#destination-fields'),
  settingsButton: document.querySelector('#settings-button'),
  closeSettings: document.querySelector('#close-settings-button'),
  otherPlace: document.querySelector('#other-place-button'),
  help: document.querySelector('#help-button'),
  toast: document.querySelector('#toast'),
};

let settings = loadSettings();
let selectedDestination = null;

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.pickup && Array.isArray(saved.destinations)) return saved;
  } catch { /* ignore invalid local configuration */ }
  return structuredClone(DEFAULTS);
}

function hasPickup() {
  const place = normalizePlace(settings.pickup);
  return Boolean(place.label && place.address);
}

function saveSettings(next) {
  settings = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  render();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove('show'), 3200);
}

function render() {
  const configured = settings.destinations.filter((place) => normalizePlace(place).address);
  elements.placeList.innerHTML = '';

  if (!hasPickup()) {
    const button = document.createElement('button');
    button.className = 'place-button';
    button.innerHTML = '<span><span class="place-name">먼저 우리 집 주소를 설정해 주세요</span><span class="place-address">처음 한 번만 입력하면 됩니다.</span></span><span class="arrow">→</span>';
    button.addEventListener('click', openSettings);
    elements.placeList.append(button);
    return;
  }

  if (!configured.length) {
    const button = document.createElement('button');
    button.className = 'place-button';
    button.innerHTML = '<span><span class="place-name">자주 가는 곳을 설정해 주세요</span><span class="place-address">병원, 시장 등을 큰 버튼으로 만들 수 있어요.</span></span><span class="arrow">→</span>';
    button.addEventListener('click', openSettings);
    elements.placeList.append(button);
    return;
  }

  configured.forEach((destination) => {
    const place = normalizePlace(destination);
    const button = document.createElement('button');
    button.className = 'place-button';
    button.innerHTML = `<span><span class="place-name"></span><span class="place-address"></span></span><span class="arrow" aria-hidden="true">→</span>`;
    button.querySelector('.place-name').textContent = place.label;
    button.querySelector('.place-address').textContent = place.address;
    button.addEventListener('click', () => prepareTrip(place));
    elements.placeList.append(button);
  });
}

function openSettings() {
  const fields = elements.settingsForm.elements;
  fields.pickupLabel.value = settings.pickup.label;
  fields.pickupAddress.value = settings.pickup.address;
  fields.helpContact.value = settings.helpContact ?? '';
  elements.destinationFields.innerHTML = '';
  settings.destinations.forEach((place, index) => {
    const row = document.createElement('div');
    row.className = 'destination-row';
    row.innerHTML = `<label>목적지 ${index + 1} 이름<input name="destinationLabel${index}" required placeholder="예: 병원"></label><label>목적지 ${index + 1} 주소<input name="destinationAddress${index}" placeholder="예: ○○병원 정문"></label>`;
    row.querySelector(`[name="destinationLabel${index}"]`).value = place.label;
    row.querySelector(`[name="destinationAddress${index}"]`).value = place.address;
    elements.destinationFields.append(row);
  });
  elements.settingsDialog.showModal();
}

function prepareTrip(destination) {
  if (!hasPickup()) return openSettings();
  selectedDestination = destination;
  const brief = buildTaxiBrief(settings.pickup, destination);
  elements.confirmTitle.textContent = `${destination.label} 가기`;
  elements.tripSummary.textContent = brief.fullText;
  elements.confirmDialog.showModal();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const success = document.execCommand('copy');
    area.remove();
    return success;
  }
}

function openKakaoT() {
  // Official public route parameters for a personal taxi call are not available.
  // This only asks Android to open the installed Kakao T app; the user confirms the call inside it.
  const appIntent = 'intent://open/#Intent;scheme=kakaot;package=com.kakao.taxi;end';
  const fallback = getKakaoTFallbackUrl();
  const startedAt = Date.now();
  window.location.href = appIntent;
  window.setTimeout(() => {
    if (document.visibilityState === 'visible' && Date.now() - startedAt > 700) {
      showToast('카카오 T가 열리지 않으면 홈 화면에서 카카오 T를 직접 눌러 주세요.');
    }
  }, 900);
  // Market URL is intentionally not opened automatically: the installed app may have launched.
  window.__momTaxiStoreFallback = fallback;
}

async function startTrip() {
  if (!selectedDestination) return;
  const brief = buildTaxiBrief(settings.pickup, selectedDestination);
  const copied = await copyText(brief.fullText);
  elements.confirmDialog.close();
  showToast(copied ? '출발지와 목적지를 복사했어요. 카카오 T에서 붙여넣어 주세요.' : '카카오 T에서 주소를 직접 확인해 주세요.');
  window.setTimeout(openKakaoT, 500);
}

async function requestHelp() {
  if (!hasPickup()) return openSettings();
  const destination = selectedDestination || settings.destinations.find((item) => normalizePlace(item).address) || { label: '목적지 미정', address: '카카오 T에서 목적지를 확인해 주세요.' };
  const message = buildHelpMessage(settings.pickup, destination);
  await copyText(message);
  if (navigator.share) {
    try {
      await navigator.share({ title: '택시 호출 도움 요청', text: message });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  if (settings.helpContact) window.location.href = `sms:${settings.helpContact}?body=${encodeURIComponent(message)}`;
  else showToast('도움 요청 내용을 복사했어요. 가족에게 붙여넣어 보내 주세요.');
}

elements.settingsButton.addEventListener('click', openSettings);
elements.closeSettings.addEventListener('click', () => elements.settingsDialog.close());
elements.otherPlace.addEventListener('click', () => {
  if (!hasPickup()) return openSettings();
  const label = window.prompt('어디로 가세요? (예: 동네 주민센터)');
  const address = label ? window.prompt(`${label}의 주소를 적어 주세요.`) : '';
  if (label && address) prepareTrip({ label, address });
});
elements.help.addEventListener('click', requestHelp);
elements.startKakao.addEventListener('click', (event) => { event.preventDefault(); startTrip(); });
elements.settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = new FormData(elements.settingsForm);
  const destinations = settings.destinations.map((_, index) => ({
    label: String(fields.get(`destinationLabel${index}`) ?? '').trim(),
    address: String(fields.get(`destinationAddress${index}`) ?? '').trim(),
  }));
  saveSettings({
    pickup: { label: String(fields.get('pickupLabel')).trim(), address: String(fields.get('pickupAddress')).trim() },
    destinations,
    helpContact: String(fields.get('helpContact') ?? '').trim(),
  });
  elements.settingsDialog.close();
  showToast('주소를 저장했어요.');
});

render();
