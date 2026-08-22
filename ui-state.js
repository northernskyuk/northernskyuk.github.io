function populateButtons(tracks) {
    const buttons = document.querySelectorAll('#mainButtonSection .button');

    buttons.forEach((button, index) => {
        const track = tracks[index];
        const artworkElement = button.querySelector('.button-artwork');
        const trackNameElement = button.querySelector('.button-track-name');
        const artistNameElement = button.querySelector('.button-artist-name');

        if (track) {
            if (artworkElement) {
                artworkElement.src = track.album.images[0].url;
                artworkElement.alt = `${track.album.name} Artwork`;
                artworkElement.style.visibility = 'visible';
            }
            if (trackNameElement) trackNameElement.textContent = track.name;
            if (artistNameElement) artistNameElement.textContent = track.artists[0].name;

            button.dataset.trackUri = track.uri;
            button.style.display = 'flex';
        } else {
            if (trackNameElement) trackNameElement.textContent = '';
            if (artistNameElement) artistNameElement.textContent = '';
            if (artworkElement) {
                artworkElement.src = '';
                artworkElement.alt = 'No Artwork';
                artworkElement.style.visibility = 'hidden';
            }
            delete button.dataset.trackUri;
            button.style.display = 'flex';
        }
    });
}

function updateConnectMessage() {
    const connectMessage = document.getElementById('connectMessage');
    if (!connectMessage) return;

    if (typeof retrieveAccessToken === 'function' && retrieveAccessToken()) {
        connectMessage.textContent = 'Search or connect from another device to start playback!';
        connectMessage.style.display = 'block';
    } else {
        connectMessage.textContent = 'Press a button to connect to Spotify';
        connectMessage.style.display = 'block';
    }
}

const PLAYBACK_MODE_KEY = 'spotify_playback_mode';

const setButtonLabel = (button, label) => {
    const labelElement = document.createElement('span');
    labelElement.className = 'playback-choice-label';
    labelElement.textContent = label;
    button.replaceChildren(labelElement);
    button.dataset.deviceId = '';
    button.style.display = 'flex';
};

const hidePlaybackChoiceLabels = () => {
    document.querySelectorAll('.playback-choice-label').forEach(label => {
        label.style.display = 'none';
    });
    document.querySelectorAll('.playback-choice').forEach(button => {
        button.classList.remove('playback-choice');
    });
};

const showPlaybackGrid = () => {
    const buttons = document.querySelectorAll('#mainButtonSection .button');
    buttons.forEach(button => {
        button.style.display = 'flex';
    });
    buttons[0].removeAttribute('id');
    buttons[1].removeAttribute('id');
    buttons.forEach(button => delete button.dataset.setupChoice);
};

const showPlaybackChoice = () => {
    const buttons = document.querySelectorAll('#mainButtonSection .button');
    buttons.forEach((button, index) => {
        button.style.display = 'flex';
        button.dataset.setupChoice = index < 2 ? 'true' : 'false';
        delete button.dataset.deviceId;
        delete button.dataset.trackUri;
    });
    setButtonLabel(buttons[0], 'BROWSER PLAYBACK');
    setButtonLabel(buttons[1], 'SPOTIFY CONNECT');
    document.getElementById('connectMessage').textContent = 'Choose where Spotify should play';
    document.getElementById('connectMessage').style.display = 'block';
};

const showConnectDevices = async () => {
    const buttons = document.querySelectorAll('#mainButtonSection .button');
    buttons[0].removeAttribute('id');
    buttons[1].removeAttribute('id');
    buttons.forEach(button => {
        button.style.display = 'none';
        delete button.dataset.setupChoice;
        delete button.dataset.trackUri;
    });

    try {
        const { devices } = await fetchSpotifyDevices();
        devices.slice(0, 12).forEach((device, index) => {
            const button = buttons[index];
            setButtonLabel(button, device.name);
            button.dataset.deviceId = device.id;
            button.classList.add('connect-device');
            button.title = `${device.type}${device.is_active ? ' (active)' : ''}`;
        });
        addDeviceSelectorBackButton(buttons);

        if (!devices.length) {
            setButtonLabel(buttons[0], 'NO DEVICES FOUND');
        }
        document.getElementById('connectMessage').textContent = 'Choose a Spotify Connect device';
    } catch (error) {
        console.error('Error fetching Spotify devices:', error);
        setButtonLabel(buttons[0], 'RETRY CONNECT');
        addDeviceSelectorBackButton(buttons);
        document.getElementById('connectMessage').textContent = 'Spotify Connect devices unavailable';
    }
};

const addDeviceSelectorBackButton = (buttons) => {
    const backButton = buttons[12];
    backButton.replaceChildren();
    backButton.dataset.selectorBack = 'true';
    backButton.classList.add('playback-choice');
    setButtonLabel(backButton, 'BACK');
    backButton.onclick = null;
    backButton.title = 'Return without changing playback device';
};

const showDeviceSelector = async () => {
    const buttons = document.querySelectorAll('#mainButtonSection .button');
    buttons.forEach(button => {
        button.style.display = 'flex';
        button.replaceChildren();
        delete button.dataset.trackUri;
        delete button.dataset.deviceId;
        delete button.dataset.playbackMode;
        button.classList.remove('playback-choice', 'connect-device');
    });

    const browserButton = buttons[0];
    setButtonLabel(browserButton, 'BROWSER PLAYBACK');
    browserButton.dataset.playbackMode = 'browser';
    browserButton.classList.add('playback-choice');

    try {
        const { devices } = await fetchSpotifyDevices();
        devices.slice(0, 11).forEach((device, index) => {
            const button = buttons[index + 1];
            setButtonLabel(button, device.name);
            button.dataset.deviceId = device.id;
            button.classList.add('connect-device', 'playback-choice');
            button.title = `${device.type}${device.is_active ? ' (active)' : ''}`;
        });
        addDeviceSelectorBackButton(buttons);
        document.getElementById('connectMessage').textContent = 'Choose a playback device';
    } catch (error) {
        console.error('Error fetching Spotify devices:', error);
        setButtonLabel(buttons[1], 'DEVICES UNAVAILABLE');
        addDeviceSelectorBackButton(buttons);
        document.getElementById('connectMessage').textContent = 'Spotify Connect devices unavailable';
    }
    document.getElementById('connectMessage').style.display = 'block';
};

const selectPlaybackMode = async (mode) => {
    if (mode === 'browser') {
        setSelectedDeviceId(null);
        localStorage.setItem(PLAYBACK_MODE_KEY, mode);
        window.location.reload();
        return;
    }

    await showConnectDevices();
};

const selectPlaybackTarget = async (button) => {
    if (button.dataset.playbackMode === 'browser') {
        setSelectedDeviceId(null);
        localStorage.setItem(PLAYBACK_MODE_KEY, 'browser');
        window.location.reload();
        return;
    }
    if (button.dataset.deviceId) {
        await selectConnectDevice(button.dataset.deviceId);
    }
};

const selectConnectDevice = async (deviceId) => {
    try {
        await transferPlayback(deviceId, true);
        setSelectedDeviceId(deviceId);
        localStorage.setItem(PLAYBACK_MODE_KEY, 'connect');
        window.location.reload();
    } catch (error) {
        console.error('Error selecting Spotify Connect device:', error);
    }
};

function bindSearchControlButtons() {
    const shuffle = document.getElementById('shuffle');
    const volumeUp = document.getElementById('volumeUp');
    const volumeDown = document.getElementById('volumeDown');

    if (shuffle) {
        shuffle.addEventListener('click', () => {
            shuffle.classList.add('active');
            setTimeout(() => shuffle.classList.remove('active'), 100);
            toggleShuffle();
        });
    }

    if (volumeUp) {
        volumeUp.addEventListener('click', () => {
            volumeUp.classList.add('active');
            setTimeout(() => volumeUp.classList.remove('active'), 100);
            if (typeof isConnectMode === 'function' && isConnectMode()) {
                adjustConnectVolume(5);
            } else if (window.player) {
                window.player.getVolume().then(currentVolume => {
                    const newVolume = Math.min(1, currentVolume + 0.05);
                    window.player.setVolume(newVolume);
                });
            }
        });
    }

    if (volumeDown) {
        volumeDown.addEventListener('click', () => {
            volumeDown.classList.add('active');
            setTimeout(() => volumeDown.classList.remove('active'), 100);
            if (typeof isConnectMode === 'function' && isConnectMode()) {
                adjustConnectVolume(-5);
            } else if (window.player) {
                window.player.getVolume().then(currentVolume => {
                    const newVolume = Math.max(0, currentVolume - 0.05);
                    window.player.setVolume(newVolume);
                });
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initInputHandling();
    const playbackMode = localStorage.getItem(PLAYBACK_MODE_KEY);
    if (!playbackMode) {
        showPlaybackChoice();
    } else if (playbackMode === 'connect') {
        hidePlaybackChoiceLabels();
        showPlaybackGrid();
        fetchPlayQueue();
        window.playbackSetupComplete = true;
    } else {
        hidePlaybackChoiceLabels();
        showPlaybackGrid();
    }
    bindConnectControls();
    updateConnectMessage();
    bindSearchControlButtons();
});
