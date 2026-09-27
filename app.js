/**
 * Away Note - Core Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const setupView = document.getElementById('setup-view');
  const awayView = document.getElementById('away-view');
  const setupForm = document.getElementById('setup-form');

  // Input Elements
  const inputTitle = document.getElementById('input-title');
  const inputNote = document.getElementById('input-note');
  const inputExactTime = document.getElementById('input-exact-time');
  
  // Clocks & Previews
  const setupClock = document.getElementById('setup-clock');
  const awayCurrentTime = document.getElementById('away-current-time');
  const previewReturnTime = document.getElementById('preview-return-time');
  const previewDuration = document.getElementById('preview-duration');

  // Display Screen Elements
  const displayTitle = document.getElementById('display-title');
  const displayReturnTime = document.getElementById('display-return-time');
  const displayNote = document.getElementById('display-note');
  const displayNoteWrapper = document.getElementById('display-note-wrapper');
  
  // Timer Elements
  const timerHours = document.getElementById('timer-hours');
  const timerMinutes = document.getElementById('timer-minutes');
  const timerSeconds = document.getElementById('timer-seconds');
  const countdownTimer = document.getElementById('countdown-timer');
  const timeupBanner = document.getElementById('timeup-banner');
  const overdueCounter = document.getElementById('overdue-counter');
  const awayProgressBar = document.getElementById('away-progress-bar');

  // Controls & Buttons
  const btnStartAway = document.getElementById('btn-start-away');
  const btnExitAway = document.getElementById('btn-exit-away');
  const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
  const timeModeTabs = document.querySelectorAll('.mode-tab');
  const quickTimeContainer = document.getElementById('quick-time-container');
  const exactTimeContainer = document.getElementById('exact-time-container');
  const durationBtns = document.querySelectorAll('.duration-btn');

  // --- State Variables ---
  let selectedMode = 'quick'; // 'quick' | 'exact'
  let selectedMinutes = 15;
  let targetTimestamp = null;
  let startTimestamp = null;
  let timerInterval = null;
  let clockInterval = null;
  let wakeLock = null;

  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- 1. Live Clocks ---
  function updateClocks() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    if (setupClock) setupClock.textContent = timeString;
    if (awayCurrentTime) awayCurrentTime.textContent = timeString;
    
    // Recalculate preview when clock updates
    calculateReturnTime();
  }

  clockInterval = setInterval(updateClocks, 1000);
  updateClocks();

  // --- 2. LocalStorage Persistence ---
  function loadSavedSettings() {
    const savedTitle = localStorage.getItem('away_note_title');
    const savedNote = localStorage.getItem('away_note_note');
    const savedTheme = localStorage.getItem('away_note_theme');
    
    if (savedTitle) inputTitle.value = savedTitle;
    if (savedNote) inputNote.value = savedNote;
    
    if (savedTheme) {
      const themeRadio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
      if (themeRadio) {
        themeRadio.checked = true;
        updateThemeClass(savedTheme);
      }
    }
  }

  function saveSettings() {
    localStorage.setItem('away_note_title', inputTitle.value.trim());
    localStorage.setItem('away_note_note', inputNote.value.trim());
    const checkedTheme = document.querySelector('input[name="theme"]:checked');
    if (checkedTheme) {
      localStorage.setItem('away_note_theme', checkedTheme.value);
    }
  }

  // --- 3. Return Time Calculation & Preview ---
  function calculateReturnTime() {
    const now = new Date();
    let target = new Date(now);

    if (selectedMode === 'quick') {
      target.setMinutes(now.getMinutes() + parseInt(selectedMinutes, 10));
    } else {
      const timeVal = inputExactTime.value;
      if (timeVal) {
        const [hours, minutes] = timeVal.split(':').map(Number);
        target.setHours(hours, minutes, 0, 0);
        // If target time is earlier than current time today, assume next day
        if (target <= now) {
          target.setDate(target.getDate() + 1);
        }
      } else {
        target.setMinutes(now.getMinutes() + 15);
      }
    }

    targetTimestamp = target.getTime();

    // Format display string for preview
    const returnTimeString = target.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const diffMs = targetTimestamp - now.getTime();
    const diffMins = Math.max(0, Math.ceil(diffMs / (1000 * 60)));

    if (previewReturnTime) previewReturnTime.textContent = returnTimeString;
    if (previewDuration) previewDuration.textContent = `${diffMins}분 남음`;

    return { targetTimestamp, returnTimeString, diffMs };
  }

  // Set default exact time picker value to +15m
  const defaultExact = new Date();
  defaultExact.setMinutes(defaultExact.getMinutes() + 15);
  const hh = String(defaultExact.getHours()).padStart(2, '0');
  const mm = String(defaultExact.getMinutes()).padStart(2, '0');
  inputExactTime.value = `${hh}:${mm}`;

  // Mode Tab Switch
  timeModeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      timeModeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedMode = tab.dataset.mode;

      if (selectedMode === 'quick') {
        quickTimeContainer.classList.add('active');
        exactTimeContainer.classList.remove('active');
      } else {
        quickTimeContainer.classList.remove('active');
        exactTimeContainer.classList.add('active');
      }
      calculateReturnTime();
    });
  });

  // Duration Buttons Click
  durationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      durationBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMinutes = parseInt(btn.dataset.minutes, 10);
      calculateReturnTime();
    });
  });

  inputExactTime.addEventListener('input', calculateReturnTime);

  // --- 4. Preset Chips Handlers ---
  function setupChips(containerId, targetInput) {
    const chips = document.querySelectorAll(`#${containerId} .chip`);
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        targetInput.value = chip.dataset.value;
        calculateReturnTime();
      });
    });

    // Remove chip active highlight if user types custom text
    targetInput.addEventListener('input', () => {
      chips.forEach(c => c.classList.remove('active'));
    });
  }

  setupChips('schedule-chips', inputTitle);
  setupChips('note-chips', inputNote);

  // --- 5. Theme Selector Handler ---
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  function updateThemeClass(themeValue) {
    document.body.className = '';
    document.body.classList.add(themeValue);

    document.querySelectorAll('.theme-card').forEach(card => {
      const input = card.querySelector('input');
      if (input && input.value === themeValue) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  themeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateThemeClass(e.target.value);
    });
  });

  // --- 6. Screen Wake Lock API ---
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.log('Wake Lock Request Failed:', err.message);
    }
  }

  function releaseWakeLock() {
    if (wakeLock !== null) {
      wakeLock.release().then(() => {
        wakeLock = null;
      });
    }
  }

  // --- 7. Fullscreen Handler ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  if (btnToggleFullscreen) {
    btnToggleFullscreen.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  // --- 8. Start Away Mode ---
  function startAwayMode() {
    const titleVal = inputTitle.value.trim();
    if (!titleVal) {
      alert('일정 / 부재 사유를 입력해주세요!');
      inputTitle.focus();
      return;
    }

    saveSettings();

    const { returnTimeString } = calculateReturnTime();
    startTimestamp = new Date().getTime();

    // Populate Away Screen (Strip emojis for clean & elegant display title)
    const cleanTitle = titleVal.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2B50}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23EC}]/gu, '').trim() || titleVal;
    displayTitle.textContent = cleanTitle;
    displayReturnTime.textContent = returnTimeString;

    const noteVal = inputNote.value.trim();
    if (noteVal) {
      const cleanNote = noteVal.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2B50}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23EC}]/gu, '').trim() || noteVal;
      displayNote.textContent = cleanNote;
      displayNoteWrapper.style.display = 'block';
    } else {
      displayNoteWrapper.style.display = 'none';
    }

    // Switch View
    setupView.classList.remove('active');
    awayView.classList.add('active');

    // Reset Banners
    timeupBanner.classList.add('hidden');
    countdownTimer.classList.remove('hidden');

    // Request Screen Wake Lock
    requestWakeLock();

    // Start Timer Interval
    updateTimer();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
  }

  function updateTimer() {
    const now = new Date().getTime();
    const diff = targetTimestamp - now;

    const totalDuration = targetTimestamp - startTimestamp;
    const elapsed = now - startTimestamp;
    const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    awayProgressBar.style.width = `${progressPercent}%`;

    if (diff > 0) {
      // Counting down
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      timerHours.textContent = String(hours).padStart(2, '0');
      timerMinutes.textContent = String(minutes).padStart(2, '0');
      timerSeconds.textContent = String(seconds).padStart(2, '0');
    } else {
      // Time is up / Overdue
      timeupBanner.classList.remove('hidden');

      const overdueMs = Math.abs(diff);
      const overdueMins = Math.floor(overdueMs / (1000 * 60));
      const overdueSecs = Math.floor((overdueMs % (1000 * 60)) / 1000);
      const overdueHours = Math.floor(overdueMins / 60);

      if (overdueHours > 0) {
        overdueCounter.textContent = `(초과 +${String(overdueHours).padStart(2, '0')}:${String(overdueMins % 60).padStart(2, '0')}:${String(overdueSecs).padStart(2, '0')})`;
      } else {
        overdueCounter.textContent = `(초과 +${String(overdueMins).padStart(2, '0')}:${String(overdueSecs).padStart(2, '0')})`;
      }
    }
  }

  // --- 9. Exit Away Mode ---
  function exitAwayMode() {
    awayView.classList.remove('active');
    setupView.classList.add('active');

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    releaseWakeLock();
  }

  // Bind Form Submit & Buttons
  setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    startAwayMode();
  });

  if (btnStartAway) {
    btnStartAway.addEventListener('click', (e) => {
      e.preventDefault();
      startAwayMode();
    });
  }

  if (btnExitAway) {
    btnExitAway.addEventListener('click', (e) => {
      e.stopPropagation();
      exitAwayMode();
    });
  }

  // Click on away screen to exit (excluding utility controls)
  awayView.addEventListener('click', (e) => {
    if (!e.target.closest('.away-top-bar')) {
      exitAwayMode();
    }
  });

  // ESC Key to exit away mode
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && awayView.classList.contains('active')) {
      exitAwayMode();
    }
  });

  // Initialize
  loadSavedSettings();
  calculateReturnTime();
});
