const MIN_WPM = 100;
const MAX_WPM = 1000;
const DEFAULT_WPM = 300;
const DEFAULT_COLOR = '#f87171';
const TEXT_SIZES = [32, 40, 48, 60, 72, 84];

let state = {
  text: '',
  words: [],
  currentIndex: 0,
  isPlaying: false,
  wpm: DEFAULT_WPM,
  showSettings: false,
  textSize: 3,
  theme: 'dark',
  orpColor: DEFAULT_COLOR,
  stripChars: {
    punctuation: false,
    brackets: false,
    quotes: false
  },
  intervalId: null
};

let hasInitialized = false;

// Load saved settings from Chrome storage
function loadSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get(['wpm', 'textSize', 'theme', 'orpColor', 'stripChars'], (result) => {
      state.wpm = result.wpm || DEFAULT_WPM;
      state.textSize = result.textSize !== undefined ? result.textSize : 3;
      state.theme = result.theme || 'dark';
      state.orpColor = result.orpColor || DEFAULT_COLOR;
      state.stripChars = result.stripChars || { punctuation: false, brackets: false, quotes: false };
      console.log('Settings loaded:', state);
      
      if (!hasInitialized) {
        initialRender();
        hasInitialized = true;
      } else {
        updateUI();
      }
    });
  } else {
    if (!hasInitialized) {
      initialRender();
      hasInitialized = true;
    }
  }
}

// Save settings to Chrome storage
function saveSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.set({
      wpm: state.wpm,
      textSize: state.textSize,
      theme: state.theme,
      orpColor: state.orpColor,
      stripChars: state.stripChars
    });
  }
}

function getORPIndex(word) {
  const len = word.length;
  if (len === 1) return 0;
  if (len <= 5) return 1;
  return Math.floor(len * 0.3);
}

function processText(text) {
  let processed = text;

  if (state.stripChars.punctuation) {
    processed = processed.replace(/[.,!?;:]/g, '');
  }
  if (state.stripChars.brackets) {
    processed = processed.replace(/[\[\](){}]/g, '');
  }
  if (state.stripChars.quotes) {
    processed = processed.replace(/['"]/g, '');
  }

  const wordArray = processed.split(/\s+/).filter(w => w.length > 0);
  state.words = wordArray;
  state.currentIndex = 0;
  state.text = text;
  
  updateWordDisplay();
}

function togglePlay() {
  console.log('togglePlay called, current isPlaying:', state.isPlaying);
  
  // Reset to start if we're at the end
  if (state.currentIndex >= state.words.length - 1) {
    state.currentIndex = 0;
  }
  
  if (!state.isPlaying) {
    const msPerWord = 60000 / state.wpm;
    console.log('Starting playback, ms per word:', msPerWord);
    
    // Clear any existing interval first
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    
    state.isPlaying = true;
    updatePlayButton();
    
    const intervalId = setInterval(() => {
      if (state.currentIndex >= state.words.length - 1) {
        clearInterval(intervalId);
        state.isPlaying = false;
        state.intervalId = null;
        updateWordDisplay();
        updatePlayButton();
      } else {
        state.currentIndex = state.currentIndex + 1;
        updateWordDisplay();
      }
    }, msPerWord);
    
    state.intervalId = intervalId;
  } else {
    console.log('Pausing playback');
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    state.isPlaying = false;
    state.intervalId = null;
    updatePlayButton();
    updateWordDisplay();
  }
}

function reset() {
  console.log('Reset called');
  if (state.intervalId) {
    clearInterval(state.intervalId);
  }
  state.isPlaying = false;
  state.currentIndex = 0;
  state.intervalId = null;
  updatePlayButton();
  updateWordDisplay();
}

function handleProgressClick(e) {
  console.log('Progress bar clicked');
  const rect = e.currentTarget.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const pct = clickX / rect.width;
  const idx = Math.floor(pct * state.words.length);
  if (state.intervalId) {
    clearInterval(state.intervalId);
  }
  state.currentIndex = Math.min(Math.max(0, idx), state.words.length - 1);
  state.isPlaying = false;
  state.intervalId = null;
  updatePlayButton();
  updateWordDisplay();
}

function closeReader() {
  window.parent.postMessage({ type: 'RSVP_CLOSE' }, '*');
}

function updatePlayButton() {
  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    const iconPath = state.isPlaying ? 'vectors/pause-square.svg' : 'vectors/play-alt.svg';
    const iconUrl = chrome.runtime.getURL(iconPath);
    playBtn.innerHTML = `<img src="${iconUrl}" alt="${state.isPlaying ? 'Pause' : 'Play'}" style="width: 1.5rem; height: 1.5rem; display: block; filter: invert(1);">`;
  }
}

function updateWordDisplay() {
  const currentWord = state.words[state.currentIndex] || '';
  const progress = state.words.length > 0 ? ((state.currentIndex + 1) / state.words.length) * 100 : 0;
  const orpIdx = getORPIndex(currentWord);

  const wordParts = {
    before: currentWord.slice(0, orpIdx),
    orp: currentWord[orpIdx] || '',
    after: currentWord.slice(orpIdx + 1)
  };

  const wordContainer = document.querySelector('.word-container');
  const progressFill = document.querySelector('.progress-fill');
  const counter = document.querySelector('.counter');

  if (wordContainer) {
    wordContainer.innerHTML = `
      <span class="word-part word-before ${state.theme === 'dark' ? 'text-white' : 'text-dark'}">${wordParts.before}</span>
      <span class="word-orp ${state.theme === 'dark' ? 'text-white' : 'text-dark'}" style="color: ${state.orpColor}; background-color: ${state.orpColor}20; border-color: ${state.orpColor};">${wordParts.orp}</span>
      <span class="word-part word-after ${state.theme === 'dark' ? 'text-white' : 'text-dark'}">${wordParts.after}</span>
    `;
  }

  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }

  if (counter) {
    counter.textContent = `Word ${state.currentIndex + 1} of ${state.words.length}`;
  }
}

function applyThemeIcons() {
  const darkIcon = document.getElementById('theme-icon-dark');
  const lightIcon = document.getElementById('theme-icon-light');

  if (!darkIcon || !lightIcon) return;

  // Set SVG sources
  darkIcon.src = chrome.runtime.getURL('vectors/moon-stars.svg');
  lightIcon.src = chrome.runtime.getURL('vectors/sun.svg');

  // Apply color filter based on theme
  if (state.theme === 'dark') {
    darkIcon.style.filter = 'invert(1)';
    lightIcon.style.filter = 'invert(1)';
  } else {
    lightIcon.style.filter = 'invert(1)';
    darkIcon.style.filter = 'none';
  }
}



function updateUI() {
  // Update theme
  document.body.className = state.theme === 'dark' ? 'dark-mode' : 'light-mode';
  
  const themeClass = state.theme === 'dark' ? 'dark' : 'light';
  const textClass = state.theme === 'dark' ? 'text-white' : 'text-dark';
  
  // Update all elements with theme classes
  document.querySelectorAll('.card, .display-area, .progress-bar, .settings-panel').forEach(el => {
    el.className = el.className.replace(/\b(dark|light)\b/g, themeClass);
  });
  
  document.querySelectorAll('.text-white, .text-dark').forEach(el => {
    el.className = el.className.replace(/\btext-(white|dark)\b/g, textClass);
  });
  
  // Update colors
  updateActiveButtonColors();
  
  // Update word display
  updateWordDisplay();
  
  // Update settings panel visibility
  const settingsPanel = document.querySelector('.settings-panel');
  if (settingsPanel) {
    if (state.showSettings) {
      settingsPanel.classList.remove('hidden');
    } else {
      settingsPanel.classList.add('hidden');
    }
  }
  
  // Update word container size
  const wordContainer = document.querySelector('.word-container');
  if (wordContainer) {
    wordContainer.style.fontSize = `${TEXT_SIZES[state.textSize]}px`;
  }
  
  // Update WPM inputs
  const wpmInput = document.getElementById('wpm-input');
  const wpmSlider = document.getElementById('wpm-slider');
  if (wpmInput) wpmInput.value = state.wpm;
  if (wpmSlider) wpmSlider.value = state.wpm;
  
  // Update color inputs
  const colorPicker = document.getElementById('color-picker');
  const colorText = document.getElementById('color-text');
  if (colorPicker) colorPicker.value = state.orpColor;
  if (colorText) colorText.value = state.orpColor;
  
  // Update checkboxes
  const stripPunctuation = document.getElementById('strip-punctuation');
  const stripBrackets = document.getElementById('strip-brackets');
  const stripQuotes = document.getElementById('strip-quotes');
  if (stripPunctuation) stripPunctuation.checked = state.stripChars.punctuation;
  if (stripBrackets) stripBrackets.checked = state.stripChars.brackets;
  if (stripQuotes) stripQuotes.checked = state.stripChars.quotes;
  
  // Update text area
  const textArea = document.getElementById('text-area');
  if (textArea && textArea.value !== state.text) {
    textArea.value = state.text;
  }
  
  // Update size buttons
  TEXT_SIZES.forEach((_, i) => {
    const btn = document.getElementById(`size-btn-${i}`);
    if (btn) {
      if (i === state.textSize) {
        btn.className = 'size-btn active';
        btn.style = `background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd); color: white;`;
      } else {
        btn.className = `size-btn inactive ${state.theme}`;
        btn.style = '';
      }
    }
  });

  applyThemeIcons();
  
  // Update theme buttons
  const themeDarkBtn = document.getElementById('theme-dark-btn');
  const themeLightBtn = document.getElementById('theme-light-btn');
  if (themeDarkBtn) {
    if (state.theme === 'dark') {
      themeDarkBtn.className = 'theme-btn active';
      themeDarkBtn.style = `background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd); color: white;`;
    } else {
      themeDarkBtn.className = `theme-btn inactive ${state.theme}`;
      themeDarkBtn.style = '';
    }
  }
  if (themeLightBtn) {
    if (state.theme === 'light') {
      themeLightBtn.className = 'theme-btn active';
      themeLightBtn.style = `background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd); color: white;`;
    } else {
      themeLightBtn.className = `theme-btn inactive ${state.theme}`;
      themeLightBtn.style = '';
    }
  }
}

function updateActiveButtonColors() {
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) {
    progressFill.style.background = `linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd)`;
  }

  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.style.background = `linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd)`;
  }
  
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.style.background = `linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd)`;
  }
  
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.style.background = `linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd)`;
  }

  const activeSizeBtn = document.getElementById(`size-btn-${state.textSize}`);
  if (activeSizeBtn && activeSizeBtn.classList.contains('active')) {
    activeSizeBtn.style.background = `linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd)`;
  }

  const activeThemeBtn = document.getElementById(`theme-${state.theme}-btn`);
  if (activeThemeBtn && activeThemeBtn.classList.contains('active')) {
    activeThemeBtn.style.background = `linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd)`;
  }
}

// INITIAL RENDER - Only called once
function initialRender() {
  const currentWord = state.words[state.currentIndex] || '';
  const progress = state.words.length > 0 ? ((state.currentIndex + 1) / state.words.length) * 100 : 0;
  const orpIdx = getORPIndex(currentWord);

  const wordParts = {
    before: currentWord.slice(0, orpIdx),
    orp: currentWord[orpIdx] || '',
    after: currentWord.slice(orpIdx + 1)
  };

  const themeClass = state.theme === 'dark' ? 'dark' : 'light';
  const textClass = state.theme === 'dark' ? 'text-white' : 'text-dark';
  const iconFilter = state.theme === 'dark' ? 'invert(1)' : 'none';

  document.body.className = state.theme === 'dark' ? 'dark-mode' : 'light-mode';

  const playIconUrl = chrome.runtime.getURL(state.isPlaying ? 'vectors/pause-square.svg' : 'vectors/play-alt.svg');
  const resetIconUrl = chrome.runtime.getURL('vectors/rotate-right.svg');
  const settingsIconUrl = chrome.runtime.getURL('vectors/settings-sliders.svg');
  const closeIconUrl = chrome.runtime.getURL('vectors/circle-xmark.svg');

  document.getElementById('app').innerHTML = `
    <div class="container ${themeClass}">
      <div class="header-section">
        <h1 class="title ${textClass}">RSVP Speed Reader</h1>
        <button class="close-btn ${textClass}" id="close-btn">
          <img src="${closeIconUrl}" alt="Close" class="close-icon" style="width: 1.75rem; height: 1.75rem; display: block;">
        </button>

      </div>

      <div class="card ${themeClass} custom-scrollbar">

        <div class="display-area ${themeClass}">
          <div class="word-container" style="font-size: ${TEXT_SIZES[state.textSize]}px;">
            <span class="word-part word-before ${textClass}">${wordParts.before}</span>
            <span class="word-orp ${textClass}" style="color: ${state.orpColor}; background-color: ${state.orpColor}20; border-color: ${state.orpColor};">${wordParts.orp}</span>
            <span class="word-part word-after ${textClass}">${wordParts.after}</span>
          </div>
          <div class="counter ${textClass}">Word ${state.currentIndex + 1} of ${state.words.length}</div>
        </div>

        <div class="progress-bar ${themeClass}" id="progress-bar">
          <div class="progress-fill" style="width: ${progress}%; background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd);"></div>
        </div>

        <div class="controls">
          <button class="btn btn-small ${themeClass}" style="background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd);" id="reset-btn">
            <img src="${resetIconUrl}" alt="Reset" style="width: 1.25rem; height: 1.25rem; display: block; filter: invert(1);">
          </button>
          <button class="btn btn-large ${themeClass}" style="background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd);" id="play-btn">
            <img src="${playIconUrl}" alt="${state.isPlaying ? 'Pause' : 'Play'}" style="width: 1.5rem; height: 1.5rem; display: block; filter: invert(1);">
          </button>
          <button class="btn btn-small ${themeClass}" style="background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd);" id="settings-btn">
            <img src="${settingsIconUrl}" alt="Settings" style="width: 1.25rem; height: 1.25rem; display: block; filter: invert(1);">
          </button>
        </div>

        <div class="settings-panel ${themeClass} ${state.showSettings ? '' : 'hidden'}">
          <h2 class="settings-title ${textClass}">Settings</h2>

          <div class="setting-group">
            <label class="label ${textClass}">Speed (Words Per Minute)</label>
            <div class="input-group">
              <input type="number" id="wpm-input" min="${MIN_WPM}" max="${MAX_WPM}" step="50" value="${state.wpm}" class="input ${themeClass}">
              <span class="${textClass}">WPM</span>
            </div>
            <input type="range" id="wpm-slider" min="${MIN_WPM}" max="${MAX_WPM}" step="50" value="${state.wpm}" class="slider">
            <div class="slider-labels ${textClass}">
              <span>${MIN_WPM}</span>
              <span>${MAX_WPM}</span>
            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">Text Size</label>
            <div class="text-size-grid">
              ${TEXT_SIZES.map((size, i) => {
                const isActive = i === state.textSize;
                const btnClass = isActive ? 'size-btn active' : `size-btn inactive ${state.theme}`;
                const btnStyle = isActive ? `background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd); color: white;` : '';
                return `<button class="${btnClass}" style="${btnStyle}" id="size-btn-${i}">${size}</button>`;
              }).join('')}
            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">Theme</label>
            <div class="theme-buttons">
              <button
                class="theme-btn ${state.theme === 'dark' ? 'active' : `inactive ${state.theme}`}"
                data-theme="dark"
                id="theme-dark-btn">
                <img id="theme-icon-dark" />
                Dark
              </button>

              <button
                class="theme-btn ${state.theme === 'light' ? 'active' : `inactive ${state.theme}`}"
                data-theme="light"
                id="theme-light-btn">
                <img id="theme-icon-light" />
                Light
              </button>

            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">ORP Highlight Color</label>
            <div class="input-group">
              <input type="color" id="color-picker" value="${state.orpColor}" class="color-picker ${themeClass}">
              <input type="text" id="color-text" value="${state.orpColor}" class="input ${themeClass}" placeholder="#f87171">
            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">Strip Characters</label>
            <div class="checkbox-group">
              <label class="checkbox-label ${themeClass}">
                <input type="checkbox" id="strip-punctuation" ${state.stripChars.punctuation ? 'checked' : ''}>
                <span class="${textClass}">Punctuation ( . , ! ? ; : )</span>
              </label>
              <label class="checkbox-label ${themeClass}">
                <input type="checkbox" id="strip-brackets" ${state.stripChars.brackets ? 'checked' : ''}>
                <span class="${textClass}">Brackets ( [ ] ( ) { } )</span>
              </label>
              <label class="checkbox-label ${themeClass}">
                <input type="checkbox" id="strip-quotes" ${state.stripChars.quotes ? 'checked' : ''}>
                <span class="${textClass}">Quotes ( ' " )</span>
              </label>
            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">Custom Text</label>
            <textarea id="text-area" rows="4" class="textarea ${themeClass}" placeholder="Paste text here to read...">${state.text}</textarea>
          </div>
        </div>

        <div class="instructions ${textClass}">
          <p><strong>Keyboard shortcuts:</strong></p>
          <p>Space = Play/Pause • R = Reset • Esc = Close</p>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners ONCE using event delegation on the app container
  attachEventListeners();
}

function attachEventListeners() {
  // Use event delegation - attach listeners to the app container
  const app = document.getElementById('app');
  
  // Delegate all button clicks
  app.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    
    const id = target.id;
    
    switch(id) {
      case 'close-btn':
        closeReader();
        break;
      case 'reset-btn':
        reset();
        break;
      case 'play-btn':
        togglePlay();
        break;
      case 'settings-btn':
        state.showSettings = !state.showSettings;
        updateUI();
        break;
      case 'theme-dark-btn':
        if (state.theme !== 'dark') {
          state.theme = 'dark';
          saveSettings();
          updateUI();
        }
        break;
      case 'theme-light-btn':
        if (state.theme !== 'light') {
          state.theme = 'light';
          saveSettings();
          updateUI();
        }
        break;
      default:
        // Check if it's a size button
        if (id && id.startsWith('size-btn-')) {
          const index = parseInt(id.replace('size-btn-', ''));
          if (!isNaN(index)) {
            state.textSize = index;
            saveSettings();
            updateUI();
          }
        }
    }
  });

  
  // Progress bar click
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    progressBar.addEventListener('click', handleProgressClick);
  }
  
  // WPM controls
  app.addEventListener('change', (e) => {
    if (e.target.id === 'wpm-input') {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= MIN_WPM && val <= MAX_WPM) {
        state.wpm = val;
        saveSettings();
        const slider = document.getElementById('wpm-slider');
        if (slider) slider.value = val;
      }
    } else if (e.target.id === 'color-text') {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        state.orpColor = e.target.value;
        saveSettings();
        updateUI();
      }
    } else if (e.target.id === 'strip-punctuation') {
      state.stripChars.punctuation = e.target.checked;
      saveSettings();
      processText(state.text);
    } else if (e.target.id === 'strip-brackets') {
      state.stripChars.brackets = e.target.checked;
      saveSettings();
      processText(state.text);
    } else if (e.target.id === 'strip-quotes') {
      state.stripChars.quotes = e.target.checked;
      saveSettings();
      processText(state.text);
    }
  });
  
  app.addEventListener('input', (e) => {
    if (e.target.id === 'wpm-slider') {
      const val = parseInt(e.target.value, 10);
      state.wpm = val;
      saveSettings();
      const input = document.getElementById('wpm-input');
      if (input) input.value = val;
    } else if (e.target.id === 'color-picker') {
      state.orpColor = e.target.value;
      saveSettings();
      updateUI();
    } else if (e.target.id === 'text-area') {
      processText(e.target.value);
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      reset();
    } else if (e.key === 'Escape') {
      closeReader();
    }
  });
}

// Listen for text from parent
window.addEventListener('message', (e) => {
  if (e.data.type === 'RSVP_SET_TEXT') {
    console.log('Received text from parent');
    processText(e.data.text);
  }
});

// Initial load
console.log('Reader initializing...');
loadSettings();

// Listen for settings changes from popup
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('Storage changed:', changes);
    
    if (changes.wpm) {
      state.wpm = changes.wpm.newValue;
      if (state.isPlaying && state.intervalId) {
        clearInterval(state.intervalId);
        state.isPlaying = false;
        togglePlay();
      }
      updateUI();
    }
    
    if (changes.textSize !== undefined) {
      state.textSize = changes.textSize.newValue;
      updateUI();
    }
    
    if (changes.theme) {
      state.theme = changes.theme.newValue;
      updateUI();
    }
    
    if (changes.orpColor) {
      state.orpColor = changes.orpColor.newValue;
      updateUI();
    }
    
    if (changes.stripChars) {
      state.stripChars = changes.stripChars.newValue;
      processText(state.text);
    }
  });
}