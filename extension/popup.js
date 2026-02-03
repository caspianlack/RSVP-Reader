const DEFAULT_SETTINGS = {
  wpm: 300,
  textSize: 3,
  theme: 'dark',
  orpColor: '#f87171',
  stripChars: {
    punctuation: false,
    brackets: false,
    quotes: false
  }
};

// Load settings and update UI
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    // WPM
    document.getElementById('wpm-input').value = settings.wpm;
    document.getElementById('wpm-slider').value = settings.wpm;

    // Text size
    document.querySelectorAll('.size-btn').forEach((btn, index) => {
      btn.classList.toggle('active', index === settings.textSize);
    });

    // Theme
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === settings.theme);
    });

    // Color
    document.getElementById('color-picker').value = settings.orpColor;
    document.getElementById('color-text').value = settings.orpColor;

    // Strip chars
    document.getElementById('strip-punctuation').checked = settings.stripChars.punctuation;
    document.getElementById('strip-brackets').checked = settings.stripChars.brackets;
    document.getElementById('strip-quotes').checked = settings.stripChars.quotes;
  });
}

// Save settings
function saveSettings(updates) {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (current) => {
    const newSettings = { ...current, ...updates };
    chrome.storage.sync.set(newSettings);
  });
}

// WPM controls
document.getElementById('wpm-input').addEventListener('change', (e) => {
  const value = parseInt(e.target.value, 10);
  if (value >= 100 && value <= 1000) {
    document.getElementById('wpm-slider').value = value;
    saveSettings({ wpm: value });
  }
});

document.getElementById('wpm-slider').addEventListener('input', (e) => {
  const value = parseInt(e.target.value, 10);
  document.getElementById('wpm-input').value = value;
  saveSettings({ wpm: value });
});

// Text size buttons
document.querySelectorAll('.size-btn').forEach((btn, index) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    saveSettings({ textSize: index });
  });
});

// Theme buttons
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    saveSettings({ theme: btn.dataset.theme });
  });
});

// Color picker
document.getElementById('color-picker').addEventListener('input', (e) => {
  document.getElementById('color-text').value = e.target.value;
  saveSettings({ orpColor: e.target.value });
});

document.getElementById('color-text').addEventListener('change', (e) => {
  if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
    document.getElementById('color-picker').value = e.target.value;
    saveSettings({ orpColor: e.target.value });
  }
});

// Strip characters checkboxes
document.getElementById('strip-punctuation').addEventListener('change', (e) => {
  chrome.storage.sync.get(['stripChars'], (result) => {
    const stripChars = result.stripChars || DEFAULT_SETTINGS.stripChars;
    stripChars.punctuation = e.target.checked;
    saveSettings({ stripChars });
  });
});

document.getElementById('strip-brackets').addEventListener('change', (e) => {
  chrome.storage.sync.get(['stripChars'], (result) => {
    const stripChars = result.stripChars || DEFAULT_SETTINGS.stripChars;
    stripChars.brackets = e.target.checked;
    saveSettings({ stripChars });
  });
});

document.getElementById('strip-quotes').addEventListener('change', (e) => {
  chrome.storage.sync.get(['stripChars'], (result) => {
    const stripChars = result.stripChars || DEFAULT_SETTINGS.stripChars;
    stripChars.quotes = e.target.checked;
    saveSettings({ stripChars });
  });
});

// Load settings on popup open
loadSettings();