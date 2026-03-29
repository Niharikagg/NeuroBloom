const STORAGE_KEY = 'neurobloom_accessibility';

const defaultSettings = {
  lowStimulation: false,
  textSize: 0,
  spacingLevel: 0,
  theme: 'petal'
};

const MAX_SPACING_LEVEL = 5;
const themeOrder = ['petal', 'sage', 'coast'];

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function applySettings(settings) {
  document.body.classList.toggle('low-stimulation', settings.lowStimulation);
  document.body.classList.remove('text-size-1', 'text-size-2', 'spacing-1', 'spacing-2', 'spacing-3', 'spacing-4', 'spacing-5');
  document.body.classList.remove('theme-petal', 'theme-sage', 'theme-coast');
  document.body.classList.add(`theme-${themeOrder.includes(settings.theme) ? settings.theme : 'petal'}`);

  if (settings.textSize === 1) {
    document.body.classList.add('text-size-1');
  }

  if (settings.textSize >= 2) {
    document.body.classList.add('text-size-2');
  }
  if (settings.spacingLevel >= 1) {
    document.body.classList.add(`spacing-${Math.min(settings.spacingLevel, MAX_SPACING_LEVEL)}`);
  }

  document.querySelectorAll('[data-setting="stimulation"]').forEach((button) => {
    button.setAttribute('aria-pressed', String(settings.lowStimulation));
  });

  document.querySelectorAll('[data-setting="text-cycle"]').forEach((button) => {
    button.textContent = 'A-/A+';
  });

  document.querySelectorAll('[data-setting="spacing-cycle"]').forEach((button) => {
    button.textContent = 'S-/S+';
  });

  document.querySelectorAll('[data-setting="theme-cycle"]').forEach((button) => {
    button.textContent = 'Theme';
    button.setAttribute('title', `Current theme: ${settings.theme}`);
    button.setAttribute('aria-label', `Theme. Current theme: ${settings.theme}`);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const settings = loadSettings();
  applySettings(settings);

  document.querySelectorAll('.access-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.setting;

      if (action === 'stimulation') {
        settings.lowStimulation = !settings.lowStimulation;
      }

      if (action === 'text-cycle') {
        settings.textSize = settings.textSize >= 2 ? 0 : settings.textSize + 1;
      }

      if (action === 'spacing-cycle') {
        settings.spacingLevel = settings.spacingLevel >= MAX_SPACING_LEVEL ? 0 : settings.spacingLevel + 1;
      }

      if (action === 'theme-cycle') {
        const currentIndex = themeOrder.indexOf(settings.theme);
        settings.theme = themeOrder[(currentIndex + 1 + themeOrder.length) % themeOrder.length];
      }

      applySettings(settings);
      saveSettings(settings);
    });
  });
});
