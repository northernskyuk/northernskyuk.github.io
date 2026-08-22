function initInputHandling() {
    if (window.__inputHandlingInitialized) return;
    window.__inputHandlingInitialized = true;

    // Cabinet hooks can hold keys unpredictably, so keep keyboard input queue-safe by default.
    const ENABLE_KEYBOARD_LONG_PRESS = false;

    const keyToButtonIndex = {
        '1': 0, '2': 1, '3': 2, '4': 3,
        'q': 4, 'w': 5, 'e': 6, 'r': 7,
        'a': 8, 's': 9, 'd': 10, 'f': 11,
        'z': 12, 'x': 13, 'c': 14, 'v': 15
    };

    const keyPressStartTimes = {};

    document.getElementById('search').addEventListener('click', toggleSearchMode);
    document.getElementById('search2').addEventListener('click', toggleSearchMode);
    document.getElementById('search3').addEventListener('click', toggleSearchMode);
    document.getElementById('browserPlayback').addEventListener('click', (event) => {
        if (event.currentTarget.dataset.setupChoice === 'true') {
            event.stopImmediatePropagation();
            selectPlaybackMode('browser');
        }
    });
    document.getElementById('connectPlayback').addEventListener('click', (event) => {
        if (event.currentTarget.dataset.setupChoice === 'true') {
            event.stopImmediatePropagation();
            selectPlaybackMode('connect');
        }
    });
    document.getElementById('mainButtonSection').addEventListener('click', (event) => {
        const playbackButton = event.target.closest('[data-playback-mode], [data-device-id]');
        if (playbackButton && (playbackButton.dataset.playbackMode || playbackButton.dataset.deviceId)) {
            selectPlaybackTarget(playbackButton);
            return;
        }
        const selectorBackButton = event.target.closest('[data-selector-back]');
        if (selectorBackButton) {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.location.reload();
            return;
        }
        const deviceButton = event.target.closest('[data-device-id]');
        if (deviceButton && deviceButton.dataset.deviceId) {
            selectConnectDevice(deviceButton.dataset.deviceId);
        }
    }, true);

    const playButton = document.getElementById('togglePlay');
    let deviceSelectorTimer = null;
    let deviceSelectorOpened = false;
    const startDeviceSelectorTimer = () => {
        deviceSelectorOpened = false;
        deviceSelectorTimer = setTimeout(() => {
            deviceSelectorOpened = true;
            showDeviceSelector();
        }, 1200);
    };
    const clearDeviceSelectorTimer = () => {
        if (deviceSelectorTimer) clearTimeout(deviceSelectorTimer);
        deviceSelectorTimer = null;
    };
    playButton.addEventListener('mousedown', startDeviceSelectorTimer);
    playButton.addEventListener('touchstart', startDeviceSelectorTimer, { passive: true });
    playButton.addEventListener('mouseup', clearDeviceSelectorTimer);
    playButton.addEventListener('mouseleave', clearDeviceSelectorTimer);
    playButton.addEventListener('touchend', clearDeviceSelectorTimer);
    playButton.addEventListener('touchcancel', clearDeviceSelectorTimer);
    playButton.addEventListener('contextmenu', event => event.preventDefault());
    playButton.addEventListener('click', event => {
        if (deviceSelectorOpened) {
            deviceSelectorOpened = false;
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }, true);
    document.getElementById('textInputDisplay').addEventListener('keydown', (event) => {
        event.preventDefault();
    });

    let textInput = '';
    let currentButton = null;
    let currentChar = '';
    let cycleTimeout = null;

    const displayElement = document.getElementById('textInputDisplay');

    function finalizeCharacter() {
        if (currentButton) {
            textInput += currentChar;
            displayElement.value = textInput;
            currentButton.index = 0;
            currentButton = null;
        }
    }

    document.querySelectorAll('#searchButtonSection .button').forEach(button => {
        const letters = button.dataset.letters;

        if (letters) {
            button.index = 0;
            button.addEventListener('click', () => {
                if (currentButton && currentButton !== button) {
                    finalizeCharacter();
                }

                currentButton = button;
                currentChar = letters[button.index];
                displayElement.value = textInput + currentChar;

                clearTimeout(cycleTimeout);
                cycleTimeout = setTimeout(() => finalizeCharacter(), 300);

                button.index = (button.index + 1) % letters.length;
            });
        } else if (button.id === 'back') {
            button.addEventListener('click', () => {
                finalizeCharacter();
                textInput = textInput.slice(0, -1);
                displayElement.value = textInput;
            });
        } else if (button.id === 'enter') {
            button.addEventListener('click', () => {
                finalizeCharacter();
                const query = textInput.trim();
                if (query) {
                    searchSpotify(query);
                }
                textInput = '';
                displayElement.value = '';
            });
        } else if (button.textContent === 'SPACE') {
            button.addEventListener('click', () => {
                finalizeCharacter();
                textInput += ' ';
                displayElement.value = textInput;
            });
        } else if (button.id === 'category') {
            button.addEventListener('click', () => {
                cycleFilter();
            });
        }
    });

    document.querySelectorAll('#resultsButtonSection .button').forEach((button, index) => {
        if (index < 12) {
            button.addEventListener('click', () => {
                const trackUri = button.dataset.trackUri;
                if (trackUri) {
                    playTrack(trackUri);
                    toggleSearchMode();
                } else {
                    console.error('No track URI found for this button');
                }
            });
        }
    });

    document.querySelectorAll('#mainButtonSection .button').forEach((button, index) => {
        if (index >= 12) return;

        let pressTimer = null;

        const startLongPressTimer = () => {
            if (!button.dataset.trackUri) return;
            button.dataset.longPressTriggered = 'false';
            pressTimer = setTimeout(() => {
                button.dataset.longPressTriggered = 'true';
                handleMainQueueButtonPress(button, index, true);
            }, POINTER_LONG_PRESS_MS);
        };

        const clearLongPressTimer = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };

        button.addEventListener('mousedown', startLongPressTimer);
        button.addEventListener('touchstart', startLongPressTimer, { passive: true });
        button.addEventListener('mouseup', clearLongPressTimer);
        button.addEventListener('mouseleave', clearLongPressTimer);
        button.addEventListener('touchend', clearLongPressTimer);
        button.addEventListener('touchcancel', clearLongPressTimer);
        button.addEventListener('contextmenu', (event) => event.preventDefault());

        button.addEventListener('click', (event) => {
            if (button.dataset.setupChoice === 'true' || button.dataset.deviceId) {
                return;
            }
            if (button.dataset.longPressTriggered === 'true') {
                button.dataset.longPressTriggered = 'false';
                event.preventDefault();
                return;
            }

            handleMainQueueButtonPress(button, index, false);
        });

        button.title = 'Tap: queue-safe jump. Hold: play now (replaces queue).';
    });

    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        const mainButtonSection = document.getElementById('mainButtonSection');
        const searchButtonSection = document.getElementById('searchButtonSection');
        const resultsButtonSection = document.getElementById('resultsButtonSection');

        if (key === 'z') {
            event.preventDefault();
        }

        if (event.repeat) {
            return;
        }

        const isMainVisible = mainButtonSection.style.display === 'grid' || mainButtonSection.style.display === '';
        const isResultVisible = resultsButtonSection.style.display === 'grid';
        const buttons = isMainVisible
            ? document.querySelectorAll('#mainButtonSection .button')
            : (isResultVisible ? document.querySelectorAll('#resultsButtonSection .button') : document.querySelectorAll('#searchButtonSection .button'));

        const buttonIndex = keyToButtonIndex[key];
        if (buttonIndex !== undefined && buttons[buttonIndex]) {
            buttons[buttonIndex].classList.add('active');

            if (isMainVisible && buttonIndex < 12) {
                keyPressStartTimes[key] = Date.now();
                return;
            }

            buttons[buttonIndex].click();
            setTimeout(() => buttons[buttonIndex].classList.remove('active'), 100);
        }
    });

    document.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        const mainButtonSection = document.getElementById('mainButtonSection');
        const resultsButtonSection = document.getElementById('resultsButtonSection');

        const isMainVisible = mainButtonSection.style.display === 'grid' || mainButtonSection.style.display === '';
        const isResultVisible = resultsButtonSection.style.display === 'grid';
        const buttons = isMainVisible
            ? document.querySelectorAll('#mainButtonSection .button')
            : (isResultVisible ? document.querySelectorAll('#resultsButtonSection .button') : document.querySelectorAll('#searchButtonSection .button'));

        const buttonIndex = keyToButtonIndex[key];
        if (buttonIndex === undefined || !buttons[buttonIndex]) {
            return;
        }

        const button = buttons[buttonIndex];
        button.classList.remove('active');

        if (!(isMainVisible && buttonIndex < 12)) {
            return;
        }

        const startedAt = keyPressStartTimes[key] || Date.now();
        delete keyPressStartTimes[key];

        const isLongPress = ENABLE_KEYBOARD_LONG_PRESS && (Date.now() - startedAt) >= KEYBOARD_LONG_PRESS_MS;
        handleMainQueueButtonPress(button, buttonIndex, isLongPress);
    });
}
