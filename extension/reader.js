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
    
    const intervalId = setInterval(() => {
      if (state.currentIndex >= state.words.length - 1) {
        clearInterval(intervalId);
        state.isPlaying = false;
        state.intervalId = null;
        updateWordDisplay();
      } else {
        state.currentIndex = state.currentIndex + 1;
        updateWordDisplay();
      }
    }, msPerWord);
    
    // Update state directly without calling setState
    state.isPlaying = true;
    state.intervalId = intervalId;
    updateWordDisplay();
  } else {
    console.log('Pausing playback');
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    // Update state directly without calling setState
    state.isPlaying = false;
    state.intervalId = null;
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
    const iconPath = state.isPlaying ? 'vectors/pause-square.svg' : 'vectors/play-alt.svg';
    const iconUrl = chrome.runtime.getURL(iconPath);
    playBtn.innerHTML = `<img src="${iconUrl}" alt="${state.isPlaying ? 'Pause' : 'Play'}" style="width: 1.5rem; height: 1.5rem; display: block; filter: invert(1);">`;
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
  const iconFilter = state.theme === 'dark' ? 'invert(1)' : 'none';

  // Add theme class to body
  document.body.className = state.theme === 'dark' ? 'dark-mode' : 'light-mode';

  // Get icon URLs
  const playIconUrl = chrome.runtime.getURL(state.isPlaying ? 'vectors/pause-square.svg' : 'vectors/play-alt.svg');
  const resetIconUrl = chrome.runtime.getURL('vectors/rotate-right.svg');
  const settingsIconUrl = chrome.runtime.getURL('vectors/settings-sliders.svg');
  const closeIconUrl = chrome.runtime.getURL('vectors/circle-xmark.svg');

  document.getElementById('app').innerHTML = `
    <div class="container ${themeClass}">
      <div class="header-section">
        <h1 class="title ${textClass}">RSVP Speed Reader</h1>
        <button class="close-btn ${textClass}" id="close-btn">
          <img src="${closeIconUrl}" alt="Close" style="width: 1.5rem; height: 1.5rem; display: block; filter: ${iconFilter};">
        </button>
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
          <div class="progress-fill" style="width: ${progress}%; background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd);"></div>
        </div>

        <div class="controls">
          <button class="btn" id="reset-btn" style="background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd); padding: 0.75rem 1.25rem;">
            <img src="${resetIconUrl}" alt="Reset" style="width: 1.125rem; height: 1.125rem; display: block; filter: invert(1);">
          </button>
          <button class="btn btn-large" id="play-btn" style="background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd);">
            <img src="${playIconUrl}" alt="${state.isPlaying ? 'Pause' : 'Play'}" style="width: 1.5rem; height: 1.5rem; display: block; filter: invert(1);">
          </button>
          <button class="btn" id="settings-btn" style="background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd); padding: 0.75rem 1.25rem;">
            <img src="${settingsIconUrl}" alt="Settings" style="width: 1.125rem; height: 1.125rem; display: block; filter: invert(1);">
          </button>
        </div>

        <div class="settings-panel ${themeClass} ${state.showSettings ? '' : 'hidden'}">
          <h3 class="settings-title ${textClass}">Settings</h3>
          
          <div class="setting-group">
            <label class="label ${textClass}">Speed (Words Per Minute)</label>
            <div class="input-group">
              <input type="number" 
                class="input ${themeClass}" 
                id="wpm-input" 
                value="${state.wpm}" 
                min="${MIN_WPM}" 
                max="${MAX_WPM}" 
                step="50"
                style="width: 5rem;">
              <span class="${textClass}">WPM</span>
            </div>
            <input type="range" 
              class="slider" 
              id="wpm-slider" 
              value="${state.wpm}" 
              min="${MIN_WPM}" 
              max="${MAX_WPM}" 
              step="50">
            <div class="slider-labels">
              <span>${MIN_WPM}</span>
              <span>${MAX_WPM}</span>
            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">Text Size</label>
            <div class="text-size-grid">
              ${TEXT_SIZES.map((size, i) => `
                <button 
                  class="size-btn ${i === state.textSize ? 'active' : `inactive ${themeClass}`}" 
                  id="size-btn-${i}"
                  ${i === state.textSize ? `style="background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd); color: white;"` : ''}>
                  ${size}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">Theme</label>
            <div class="theme-buttons">
              <button 
                class="theme-btn ${state.theme === 'dark' ? 'active' : `inactive ${themeClass}`}" 
                id="theme-dark-btn"
                ${state.theme === 'dark' ? `style="background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd); color: white;"` : ''}>
                <img src="${chrome.runtime.getURL('vectors/moon-stars.svg')}" alt="Dark" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle; margin-right: 0.25rem; filter: ${state.theme === 'dark' ? 'invert(1)' : iconFilter};">
                Dark
              </button>
              <button 
                class="theme-btn ${state.theme === 'light' ? 'active' : `inactive ${themeClass}`}" 
                id="theme-light-btn"
                ${state.theme === 'light' ? `style="background: linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd); color: white;"` : ''}>
                <img src="${chrome.runtime.getURL('vectors/sun.svg')}" alt="Light" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle; margin-right: 0.25rem; filter: ${state.theme === 'light' ? 'invert(1)' : iconFilter};">
                Light
              </button>
            </div>
          </div>

          <div class="setting-group">
            <label class="label ${textClass}">ORP Highlight Color</label>
            <div class="input-group">
              <input type="color" 
                class="color-picker ${themeClass}" 
                id="color-picker" 
                value="${state.orpColor}">
              <input type="text" 
                class="input ${themeClass}" 
                id="color-text" 
                value="${state.orpColor}"
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
          <p>Uicons by <a target="_blank" rel="noopener noreferrer" href="https://www.flaticon.com/uicons">Flaticon</a></p>
          <br>
          <p>Try the designated <a target="_blank" rel="noopener noreferrer" href="https://rsvp-speed-reader.vercel.app/">Website</a></p>
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
    // Update active button colors
    updateActiveButtonColors();
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
      // Update active button colors
      updateActiveButtonColors();
    }
  });

  if (stripPunctuation) stripPunctuation.addEventListener('change', (e) => {
    state.stripChars.punctuation = e.target.checked;
    saveSettings();
    processText(state.text);
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

function updateActiveButtonColors() {
  // Update progress bar fill
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) {
    progressFill.style.background = `linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd)`;
  }

  // Update play button
  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.style.background = `linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd)`;
  }

  // Update active size button
  const activeSizeBtn = document.getElementById(`size-btn-${state.textSize}`);
  if (activeSizeBtn && activeSizeBtn.classList.contains('active')) {
    activeSizeBtn.style.background = `linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd)`;
  }

  // Update active theme button
  const activeThemeBtn = document.getElementById(`theme-${state.theme}-btn`);
  if (activeThemeBtn && activeThemeBtn.classList.contains('active')) {
    activeThemeBtn.style.background = `linear-gradient(to right, ${state.orpColor}, ${state.orpColor}dd)`;
  }
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
// Listen for settings changes from popup
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('Storage changed:', changes);
    
    // Update WPM if changed
    if (changes.wpm) {
      setState({ wpm: changes.wpm.newValue });
      // Restart playback if currently playing
      if (state.isPlaying && state.intervalId) {
        clearInterval(state.intervalId);
        togglePlay(); // This will restart with new WPM
      }
    }
    
    // Update text size if changed
    if (changes.textSize !== undefined) {
      setState({ textSize: changes.textSize.newValue });
    }
    
    // Update theme if changed
    if (changes.theme) {
      setState({ theme: changes.theme.newValue });
    }
    
    // Update color if changed
    if (changes.orpColor) {
      setState({ orpColor: changes.orpColor.newValue });
    }
    
    // Update strip chars if changed
    if (changes.stripChars) {
      setState({ stripChars: changes.stripChars.newValue });
      // Reprocess text with new strip settings
      processText(state.text);
    }
  });
}