let rsvpButton = null;
let rsvpOverlay = null;

// Create the "Read with RSVP" button
function createRSVPButton() {
  console.log('Creating RSVP button');
  const button = document.createElement('div');
  button.id = 'rsvp-speed-reader-button';
  button.innerHTML = 'Read with RSVP';
  button.style.cssText = `
  position: absolute;
  background: rgba(20, 20, 20, 0.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  z-index: 2147483647;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: none;
  user-select: none;
  transition: transform 0.2s, background 0.2s;
  `;

  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.05)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
  });
  
  button.addEventListener('click', (e) => {
    console.log('RSVP button clicked!');
    e.preventDefault();
    e.stopPropagation();
    const selectedText = window.getSelection().toString().trim();
    console.log('Selected text length:', selectedText.length);
    if (selectedText) {
      // Immediately hide the button by setting display to none
      button.style.display = 'none';
      console.log('Button hidden via display:none');
      
      // Then remove it from DOM
      setTimeout(() => {
        if (button.parentNode) {
          button.remove();
          console.log('Button removed from DOM');
        }
        rsvpButton = null;
      }, 100);
      
      // Open the reader
      openRSVPReader(selectedText);
    }
  });
  
  document.body.appendChild(button);
  console.log('Button added to body');
  return button;
}

// Show button near selected text
function showRSVPButton() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (!selectedText || selectedText.length < 3) {
    hideRSVPButton();
    return;
  }
  
  // Check if button already exists in DOM
  let button = document.getElementById('rsvp-speed-reader-button');
  if (!button) {
    button = createRSVPButton();
    rsvpButton = button;
  } else {
    rsvpButton = button;
  }
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  const buttonX = rect.left + (rect.width / 2) - 75;
  const buttonY = rect.top - 45 + window.scrollY;
  
  rsvpButton.style.left = `${buttonX}px`;
  rsvpButton.style.top = `${buttonY}px`;
  rsvpButton.style.display = 'block';
}

function hideRSVPButton() {
  console.log('hideRSVPButton called');
  const existingButton = document.getElementById('rsvp-speed-reader-button');
  if (existingButton) {
    existingButton.remove();
    console.log('Button removed from DOM');
  }
  rsvpButton = null;
}

// Open RSVP reader overlay
function openRSVPReader(text) {
  console.log('Opening RSVP reader');
  if (rsvpOverlay) {
    rsvpOverlay.remove();
  }
  
  rsvpOverlay = document.createElement('div');
  rsvpOverlay.id = 'rsvp-speed-reader-overlay';
  rsvpOverlay.innerHTML = `
    <div class="rsvp-overlay-backdrop">
      <div class="rsvp-overlay-container">
        <iframe src="${chrome.runtime.getURL('reader.html')}" 
                class="rsvp-iframe"
                frameborder="0">
        </iframe>
      </div>
    </div>
  `;
  
  document.body.appendChild(rsvpOverlay);
  
  // Wait for iframe to load, then send text
  const iframe = rsvpOverlay.querySelector('iframe');
  iframe.addEventListener('load', () => {
    iframe.contentWindow.postMessage({
      type: 'RSVP_SET_TEXT',
      text: text
    }, '*');
  });
  
  // Close on backdrop click
  const backdrop = rsvpOverlay.querySelector('.rsvp-overlay-backdrop');
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeRSVPReader();
    }
  });
  
  // Listen for close message from iframe
  window.addEventListener('message', (e) => {
    if (e.data.type === 'RSVP_CLOSE') {
      closeRSVPReader();
    }
  });
}

function closeRSVPReader() {
  if (rsvpOverlay) {
    rsvpOverlay.remove();
    rsvpOverlay = null;
  }
}

// Event listeners
document.addEventListener('mouseup', () => {
  setTimeout(showRSVPButton, 10);
});

document.addEventListener('mousedown', (e) => {
  if (rsvpButton && !rsvpButton.contains(e.target)) {
    hideRSVPButton();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeRSVPReader();
  }
});

// Clean up on navigation
window.addEventListener('beforeunload', () => {
  hideRSVPButton();
  closeRSVPReader();
});