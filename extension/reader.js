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

// Load saved settings from Chrome storage
function loadSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get(['wpm', 'textSize', 'theme', 'orpColor', 'stripChars'], (result) => {
      // Update state without triggering render
      state.wpm = result.wpm || DEFAULT_WPM;
      state.textSize = result.textSize !== undefined ? result.textSize : 3;
      state.theme = result.theme || 'dark';
      state.orpColor = result.orpColor || DEFAULT_COLOR;
      state.stripChars = result.stripChars || { punctuation: false, brackets: false, quotes: false };
      console.log('Settings loaded:', state);
      render();
    });
  } else {
    render();
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

function setState(updates) {
  const oldState = { ...state };
  state = { ...state, ...updates };
  
  // Save settings when they change
  const settingsKeys = ['wpm', 'textSize', 'theme', 'orpColor', 'stripChars'];
  if (Object.keys(updates).some(key => settingsKeys.includes(key))) {
    saveSettings();
  }
  
  // Only render if state actually changed
  const stateChanged = JSON.stringify(oldState) !== JSON.stringify(state);
  if (stateChanged) {
    console.log('State changed, rendering...', updates);
    render();
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
  
  // Just update the word display, don't re-render everything
  updateWordDisplay();
}

function togglePlay() {
  console.log('togglePlay called, isPlaying:', state.isPlaying);
  if (state.currentIndex >= state.words.length - 1) {
    setState({ currentIndex: 0 });
  }
  
  if (!state.isPlaying) {
    const msPerWord = 60000 / state.wpm;
    console.log('Starting playback, ms per word:', msPerWord);
    const intervalId = setInterval(() => {
      if (state.currentIndex >= state.words.length - 1) {
        clearInterval(state.intervalId);
        setState({ isPlaying: false, intervalId: null });
      } else {
        // Don't use setState here - just update the index and re-render manually
        state.currentIndex = state.currentIndex + 1;
        updateWordDisplay();
      }
    }, msPerWord);
    setState({ isPlaying: true, intervalId });
  } else {
    console.log('Pausing playback');
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    setState({ isPlaying: false, intervalId: null });
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
  updateWordDisplay();
}

function closeReader() {
  window.parent.postMessage({ type: 'RSVP_CLOSE' }, '*');
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

  // Update only the word display and progress bar
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

  // Update play button icon
  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.innerHTML = state.isPlaying ? '⏸' : '▶';
  }
}

function render() {
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

  // DARK MODE FIX: Add theme class to body
  document.body.className = state.theme === 'dark' ? 'dark-mode' : 'light-mode';

  document.getElementById('app').innerHTML = `
    <div class="container ${themeClass}">
      <div class="header-section">
        <h1 class="title ${textClass}">RSVP Speed Reader</h1>
        <button class="close-btn ${textClass}" id="close-btn">×</button>
      </div>
      
      <div class="card ${themeClass}">
        <div class="display-area ${themeClass}">
          <div class="word-container" style="font-size: ${TEXT_SIZES[state.textSize]}px;">
            <span class="word-part word-before ${textClass}">${wordParts.before}</span>
            <span class="word-orp ${textClass}" style="color: ${state.orpColor}; background-color: ${state.orpColor}20; border-color: ${state.orpColor};">${wordParts.orp}</span>
            <span class="word-part word-after ${textClass}">${wordParts.after}</span>
          </div>
          <div class="counter ${textClass}">
            Word ${state.currentIndex + 1} of ${state.words.length}
          </div>
        </div>

        <div class="progress-bar ${themeClass}" id="progress-bar">
          <div class="progress-fill" style="width: ${progress}%; background: linear-gradient(to right, ${state.orpColor}80, ${state.orpColor});"></div>
        </div>

        <div class="controls">
          <button class="btn btn-small" style="background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd);" id="reset-btn">↺</button>
          <button class="btn btn-large" style="background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd);" id="play-btn">${state.isPlaying ? '⏸' : '▶'}</button>
          <button class="btn btn-small" style="background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd);" id="settings-btn">⚙</button>
        </div>

        <div class="settings-panel ${themeClass} ${state.showSettings ? '' : 'hidden'}">
          <h3 class="settings-title ${textClass}">Settings</h3>

          <div class="setting-group">
            <label class="label ${textClass}">Speed (Words Per Minute)</label>
            <div class="input-group">
              <input type="number" min="${MIN_WPM}" max="${MAX_WPM}" step="50" value="${state.wpm}" 
                class="input ${themeClass}" style="width: 6rem;"
                id="wpm-input">
              <span class="${textClass}">WPM</span>
            </div>
            <input type="range" min="${MIN_WPM}" max="${MAX_WPM}" step="50" value="${state.wpm}" 
              class="slider"
              id="wpm-slider">
            <div class="slider-labels ${textClass}">
              <span>${MIN_WPM}</span>
              <span>${MAX_WPM}</span>
            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">Text Size</label>
            <div class="text-size-grid">
              ${TEXT_SIZES.map((size, i) => `
                <button class="size-btn ${state.textSize === i ? 'active' : `inactive ${themeClass}`}" 
                  style="${state.textSize === i ? `background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd); color: white;` : ''}"
                  id="size-btn-${i}">${size}</button>
              `).join('')}
            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">Theme</label>
            <div class="theme-buttons">
              <button class="theme-btn ${state.theme === 'dark' ? 'active' : `inactive ${themeClass}`}" 
                style="${state.theme === 'dark' ? `background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd);` : ''}"
                id="theme-dark-btn">Dark Mode</button>
              <button class="theme-btn ${state.theme === 'light' ? 'active' : `inactive ${themeClass}`}"
                style="${state.theme === 'light' ? `background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd);` : ''}"
                id="theme-light-btn">Light Mode</button>
            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">ORP Highlight Color</label>
            <div class="input-group">
              <input type="color" value="${state.orpColor}" 
                class="color-picker"
                id="color-picker">
              <input type="text" value="${state.orpColor}" 
                class="input ${themeClass}" style="flex: 1;"
                id="color-text"
                placeholder="#f87171">
            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">Strip Characters</label>
            <div class="checkbox-group">
              <label class="checkbox-label ${textClass}">
                <input type="checkbox" ${state.stripChars.punctuation ? 'checked' : ''} id="strip-punctuation">
                Punctuation ( . , ! ? ; : )
              </label>
              <label class="checkbox-label ${textClass}">
                <input type="checkbox" ${state.stripChars.brackets ? 'checked' : ''} id="strip-brackets">
                Brackets ( [ ] ( ) { } )
              </label>
              <label class="checkbox-label ${textClass}">
                <input type="checkbox" ${state.stripChars.quotes ? 'checked' : ''} id="strip-quotes">
                Quotes ( ' " )
              </label>
            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">Edit Text</label>
            <textarea class="textarea ${themeClass}" id="text-area" rows="4">${state.text}</textarea>
          </div>
        </div>

        <div class="instructions ${textClass}">
          <p>The highlighted character is the Optimal Recognition Point (ORP)</p>
          <p>Keep your eyes focused on this spot for maximum reading speed</p>
        </div>
      </div>
    </div>
  `;

  attachEventListeners();
}

function attachEventListeners() {
  console.log('Attaching event listeners...');
  const closeBtn = document.getElementById('close-btn');
  const resetBtn = document.getElementById('reset-btn');
  const playBtn = document.getElementById('play-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const progressBar = document.getElementById('progress-bar');
  const wpmInput = document.getElementById('wpm-input');
  const wpmSlider = document.getElementById('wpm-slider');
  const colorPicker = document.getElementById('color-picker');
  const colorText = document.getElementById('color-text');
  const stripPunctuation = document.getElementById('strip-punctuation');
  const stripBrackets = document.getElementById('strip-brackets');
  const stripQuotes = document.getElementById('strip-quotes');
  const textArea = document.getElementById('text-area');
  const themeDarkBtn = document.getElementById('theme-dark-btn');
  const themeLightBtn = document.getElementById('theme-light-btn');

  console.log('Close button found:', !!closeBtn);
  console.log('Reset button found:', !!resetBtn);
  console.log('Play button found:', !!playBtn);
  console.log('Settings button found:', !!settingsBtn);

  if (closeBtn) closeBtn.addEventListener('click', () => {
    console.log('Close button clicked!');
    closeReader();
  });
  if (resetBtn) resetBtn.addEventListener('click', () => {
    console.log('Reset button clicked!');
    reset();
  });
  if (playBtn) playBtn.addEventListener('click', () => {
    console.log('Play button clicked!');
    togglePlay();
  });
  if (settingsBtn) settingsBtn.addEventListener('click', () => {
    console.log('Settings button clicked!');
    setState({ showSettings: !state.showSettings });
  });
  if (progressBar) progressBar.addEventListener('click', handleProgressClick);
  
  if (wpmInput) wpmInput.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= MIN_WPM && val <= MAX_WPM) {
      state.wpm = val;
      saveSettings();
      // Only update the slider, don't re-render
      const slider = document.getElementById('wpm-slider');
      if (slider) slider.value = val;
    }
  });

  if (wpmSlider) wpmSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    state.wpm = val;
    saveSettings();
    // Only update the input, don't re-render
    const input = document.getElementById('wpm-input');
    if (input) input.value = val;
  });
  
  // Text size buttons
  TEXT_SIZES.forEach((_, i) => {
    const btn = document.getElementById(`size-btn-${i}`);
    if (btn) btn.addEventListener('click', () => {
      state.textSize = i;
      saveSettings();
      // Update button styles without full re-render
      TEXT_SIZES.forEach((_, j) => {
        const otherBtn = document.getElementById(`size-btn-${j}`);
        if (otherBtn) {
          if (j === i) {
            otherBtn.className = 'size-btn active';
            otherBtn.style = `background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd); color: white;`;
          } else {
            otherBtn.className = `size-btn inactive ${state.theme}`;
            otherBtn.style = '';
          }
        }
      });
      // Update the word display size
      const wordContainer = document.querySelector('.word-container');
      if (wordContainer) {
        wordContainer.style.fontSize = `${TEXT_SIZES[i]}px`;
      }
    });
  });
  
  if (themeDarkBtn) themeDarkBtn.addEventListener('click', () => {
    if (state.theme !== 'dark') {
      // Store scroll position before re-render
      const card = document.querySelector('.card');
      const scrollTop = card ? card.scrollTop : 0;
      
      state.theme = 'dark';
      saveSettings();
      render();
      
      // Restore scroll position after re-render
      requestAnimationFrame(() => {
        const newCard = document.querySelector('.card');
        if (newCard) {
          newCard.scrollTop = scrollTop;
        }
      });
    }
  });

  if (themeLightBtn) themeLightBtn.addEventListener('click', () => {
    if (state.theme !== 'light') {
      // Store scroll position before re-render
      const card = document.querySelector('.card');
      const scrollTop = card ? card.scrollTop : 0;
      
      state.theme = 'light';
      saveSettings();
      render();
      
      // Restore scroll position after re-render
      requestAnimationFrame(() => {
        const newCard = document.querySelector('.card');
        if (newCard) {
          newCard.scrollTop = scrollTop;
        }
      });
    }
  });

  if (colorPicker) colorPicker.addEventListener('input', (e) => {
    state.orpColor = e.target.value;
    saveSettings();
    // Update color text without re-render
    const colorText = document.getElementById('color-text');
    if (colorText) colorText.value = e.target.value;
    // Update ORP color in display
    updateWordDisplay();
  });

  if (colorText) colorText.addEventListener('change', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
      state.orpColor = e.target.value;
      saveSettings();
      // Update color picker without re-render
      const picker = document.getElementById('color-picker');
      if (picker) picker.value = e.target.value;
      // Update ORP color in display
      updateWordDisplay();
    }
  });

  if (stripPunctuation) stripPunctuation.addEventListener('change', (e) => {
    state.stripChars.punctuation = e.target.checked;
    saveSettings();
    processText(state.text);
    // Don't call render() - processText already updates via setState
  });

  if (stripBrackets) stripBrackets.addEventListener('change', (e) => {
    state.stripChars.brackets = e.target.checked;
    saveSettings();
    processText(state.text);
  });

  if (stripQuotes) stripQuotes.addEventListener('change', (e) => {
    state.stripChars.quotes = e.target.checked;
    saveSettings();
    processText(state.text);
  });

    if (textArea) textArea.addEventListener('input', (e) => {
    // Store scroll position
    const scrollTop = textArea.scrollTop;
    processText(e.target.value);
    // Restore scroll position after processing
    requestAnimationFrame(() => {
      const newTextArea = document.getElementById('text-area');
      if (newTextArea) {
        newTextArea.scrollTop = scrollTop;
      }
    });
  });
  }

// Listen for text from parent
window.addEventListener('message', (e) => {
  if (e.data.type === 'RSVP_SET_TEXT') {
    console.log('Received text from parent');
    processText(e.data.text);
  }
});

// Initial render and load settings
console.log('Reader initializing...');
loadSettings();
