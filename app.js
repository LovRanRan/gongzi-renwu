const STORAGE_KEY = "wageQuest.v1";
const DEFAULT_SHIFT_SECONDS = 8 * 60 * 60;

const salaryInput = document.querySelector("#salaryInput");
const hoursInput = document.querySelector("#hoursInput");
const pauseButton = document.querySelector("#pauseButton");
const pauseLabel = document.querySelector("#pauseLabel");
const pauseIcon = document.querySelector("#pauseIcon");
const endButton = document.querySelector("#endButton");
const progressFill = document.querySelector("#progressFill");
const progressLabel = document.querySelector("#progressLabel");
const statusText = document.querySelector("#statusText");
const timeText = document.querySelector("#timeText");
const earningsOutput = document.querySelector("#earningsOutput");
const hourlyOutput = document.querySelector("#hourlyOutput");
const sessionOutput = document.querySelector("#sessionOutput");
const panel = document.querySelector(".quest-panel");

const moneyFormat = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactMoneyFormat = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  currencyDisplay: "narrowSymbol",
  notation: "compact",
  compactDisplay: "short",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let state = loadState();
let lastTick = performance.now();
let lastSave = performance.now();

salaryInput.value = String(state.salary);
hoursInput.value = String(state.hoursPerWeek);

function loadState() {
  const fallback = {
    salary: 500000,
    hoursPerWeek: 40,
    careerBase: 0,
    sessionSeconds: 0,
    running: true,
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      ...fallback,
      ...saved,
      salary: sanitizeNumber(saved?.salary, fallback.salary),
      hoursPerWeek: sanitizeNumber(saved?.hoursPerWeek, fallback.hoursPerWeek),
      careerBase: sanitizeNumber(saved?.careerBase, fallback.careerBase),
      sessionSeconds: sanitizeNumber(saved?.sessionSeconds, fallback.sessionSeconds),
      running: saved?.running !== false,
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sanitizeNumber(value, fallback) {
  const normalized = String(value).replace(/[¥￥,\s]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function hourlyRate() {
  const hours = Math.max(Number(state.hoursPerWeek), 1);
  return Number(state.salary) / 52 / hours;
}

function sessionEarnings() {
  return (state.sessionSeconds / 3600) * hourlyRate();
}

function careerEarnings() {
  return state.careerBase + sessionEarnings();
}

function formatMoney(value) {
  const formatter = Math.abs(value) >= 10000000 ? compactMoneyFormat : moneyFormat;
  return formatter.format(value);
}

function formatTime(totalSeconds) {
  const seconds = Math.floor(totalSeconds);
  const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const restSeconds = String(seconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${restSeconds}`;
}

function render() {
  const progress = Math.min((state.sessionSeconds / DEFAULT_SHIFT_SECONDS) * 100, 100);
  panel.classList.toggle("is-paused", !state.running);
  pauseLabel.textContent = state.running ? "暂停" : "继续";
  pauseIcon.textContent = state.running ? "II" : ">";
  statusText.textContent = state.running ? "正在工作" : "已暂停";
  timeText.textContent = formatTime(state.sessionSeconds);
  progressFill.style.width = `${progress}%`;
  progressLabel.textContent = `${Math.floor(progress)}%`;
  earningsOutput.textContent = formatMoney(careerEarnings());
  hourlyOutput.textContent = formatMoney(hourlyRate());
  sessionOutput.textContent = formatMoney(sessionEarnings());
}

function tick(now) {
  const deltaSeconds = (now - lastTick) / 1000;
  lastTick = now;

  if (state.running) {
    state.sessionSeconds += deltaSeconds;
    if (now - lastSave > 1000) {
      saveState();
      lastSave = now;
    }
  }

  render();
  requestAnimationFrame(tick);
}

function syncSettings() {
  state.salary = sanitizeNumber(salaryInput.value, 0);
  state.hoursPerWeek = Math.max(sanitizeNumber(hoursInput.value, 40), 1);
  saveState();
  render();
}

salaryInput.addEventListener("input", syncSettings);
hoursInput.addEventListener("input", syncSettings);

pauseButton.addEventListener("click", () => {
  state.running = !state.running;
  saveState();
  render();
});

endButton.addEventListener("click", () => {
  state.careerBase += sessionEarnings();
  state.sessionSeconds = 0;
  state.running = false;
  saveState();
  render();
});

window.addEventListener("beforeunload", saveState);

render();
requestAnimationFrame(tick);
