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

let currentOrpColor = DEFAULT_SETTINGS.orpColor;

// Load settings and update UI
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    // Apply theme to body
    document.body.className = settings.theme;
    currentOrpColor = settings.orpColor;
    
    // Load SVG icons
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');
    
    if (darkIcon) {
      darkIcon.src = chrome.runtime.getURL('vectors/moon-stars.svg');
      darkIcon.style.width = '1rem';
      darkIcon.style.height = '1rem';
      darkIcon.style.display = 'inline-block';
      darkIcon.style.verticalAlign = 'middle';
      darkIcon.style.marginRight = '0.25rem';
    }
    
    if (lightIcon) {
      lightIcon.src = chrome.runtime.getURL('vectors/sun.svg');
      lightIcon.style.width = '1rem';
      lightIcon.style.height = '1rem';
      lightIcon.style.display = 'inline-block';
      lightIcon.style.verticalAlign = 'middle';
      lightIcon.style.marginRight = '0.25rem';
    }
    
    // WPM
    document.getElementById('wpm-input').value = settings.wpm;
    document.getElementById('wpm-slider').value = settings.wpm;

    // Text size
    document.querySelectorAll('.size-btn').forEach((btn, index) => {
      if (index === settings.textSize) {
        btn.className = 'size-btn active';
        btn.style = `background: linear-gradient(to right, ${settings.orpColor}, ${settings.orpColor}dd); color: white;`;
      } else {
        btn.className = `size-btn inactive ${settings.theme}`;
        btn.style = '';
      }
    });

    // Theme buttons
    const themeDarkBtn = document.getElementById('theme-dark-btn');
    const themeLightBtn = document.getElementById('theme-light-btn');
    
    if (themeDarkBtn && themeLightBtn) {
      if (settings.theme === 'dark') {
        themeDarkBtn.className = 'theme-btn active';
        themeDarkBtn.style = `background: linear-gradient(to right, ${settings.orpColor}, ${settings.orpColor}dd); color: white;`;
        themeLightBtn.className = `theme-btn inactive ${settings.theme}`;
        themeLightBtn.style = '';
        
        // Set icon filters
        if (darkIcon) darkIcon.style.filter = 'invert(1)';
        if (lightIcon) lightIcon.style.filter = settings.theme === 'dark' ? 'invert(1)' : 'none';
      } else {
        themeLightBtn.className = 'theme-btn active';
        themeLightBtn.style = `background: linear-gradient(to right, ${settings.orpColor}, ${settings.orpColor}dd); color: white;`;
        themeDarkBtn.className = `theme-btn inactive ${settings.theme}`;
        themeDarkBtn.style = '';
        
        // Set icon filters
        if (lightIcon) lightIcon.style.filter = 'invert(1)';
        if (darkIcon) darkIcon.style.filter = settings.theme === 'dark' ? 'invert(1)' : 'none';
      }
    }

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
    
    // Update current color if changed
    if (updates.orpColor) {
      currentOrpColor = updates.orpColor;
    }
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
    // Update all size buttons
    document.querySelectorAll('.size-btn').forEach((b, i) => {
      if (i === index) {
        b.className = 'size-btn active';
        b.style = `background: linear-gradient(to right, ${currentOrpColor}, ${currentOrpColor}dd); color: white;`;
      } else {
        b.className = `size-btn inactive ${document.body.className}`;
        b.style = '';
      }
    });
    saveSettings({ textSize: index });
  });
});

// Theme buttons
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset.theme;
    document.body.className = theme;
    
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');
    const themeDarkBtn = document.getElementById('theme-dark-btn');
    const themeLightBtn = document.getElementById('theme-light-btn');
    
    // Update all theme buttons
    document.querySelectorAll('.theme-btn').forEach(b => {
      if (b.dataset.theme === theme) {
        b.className = 'theme-btn active';
        b.style = `background: linear-gradient(to right, ${currentOrpColor}, ${currentOrpColor}dd); color: white;`;
      } else {
        b.className = `theme-btn inactive ${theme}`;
        b.style = '';
      }
    });
    
    // Update icon filters
    if (darkIcon && lightIcon) {
      if (theme === 'dark') {
        darkIcon.style.filter = 'invert(1)';
        lightIcon.style.filter = 'none';
      } else {
        lightIcon.style.filter = 'invert(1)';
        darkIcon.style.filter = 'none';
      }
    }
    
    // Update inactive size buttons
    document.querySelectorAll('.size-btn.inactive').forEach(b => {
      b.className = `size-btn inactive ${theme}`;
    });
    
    saveSettings({ theme: theme });
  });
});

// Color picker
document.getElementById('color-picker').addEventListener('input', (e) => {
  const color = e.target.value;
  document.getElementById('color-text').value = color;
  saveSettings({ orpColor: color });
  
  // Update active buttons with new color
  updateActiveButtonColors(color);
});

document.getElementById('color-text').addEventListener('change', (e) => {
  const color = e.target.value;
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    document.getElementById('color-picker').value = color;
    saveSettings({ orpColor: color });
    
    // Update active buttons with new color
    updateActiveButtonColors(color);
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

// Helper function to update active button colors
function updateActiveButtonColors(color) {
  currentOrpColor = color;
  
  // Update active size button
  const activeSizeBtn = document.querySelector('.size-btn.active');
  if (activeSizeBtn) {
    activeSizeBtn.style.background = `linear-gradient(to right, ${color}, ${color}dd)`;
  }
  
  // Update active theme button
  const activeThemeBtn = document.querySelector('.theme-btn.active');
  if (activeThemeBtn) {
    activeThemeBtn.style.background = `linear-gradient(to right, ${color}, ${color}dd)`;
  }
}

// Load settings on popup open
loadSettings();