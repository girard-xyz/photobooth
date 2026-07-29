/* eslint n/no-unsupported-features/node-builtins: "off" */
/* globals photoboothTools */
(function () {
    const INPUT_SELECTOR = 'input[name="preview[videoDevice]"]';

    function init() {
        const input = document.querySelector(INPUT_SELECTOR);
        if (!input) {
            return;
        }
        injectPicker(input);
    }

    function injectPicker(input) {
        const wrap = document.createElement('div');
        wrap.classList.add('mt-2', 'flex', 'flex-col', 'gap-2');

        const select = document.createElement('select');
        select.classList.add(
            'w-full',
            'h-10',
            'border-2',
            'border-solid',
            'border-gray-300',
            'focus:border-brand-1',
            'rounded-md',
            'px-2'
        );
        resetOptions(select, input.value);

        const detectBtn = document.createElement('button');
        detectBtn.type = 'button';
        detectBtn.classList.add('w-full', 'h-10', 'bg-brand-1', 'text-white', 'rounded-full');
        detectBtn.textContent = photoboothTools.getTranslation('detect_devices');

        const note = document.createElement('div');
        note.classList.add('text-xs', 'text-gray-600');

        wrap.append(select, detectBtn, note);
        input.after(wrap);

        detectBtn.addEventListener('click', function () {
            detectCameras(select, note, input, false);
        });

        select.addEventListener('change', function () {
            input.value = select.value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // silently pre-populate if camera permission was already granted
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions
                .query({ name: 'camera' })
                .then(function (result) {
                    if (result.state === 'granted') {
                        detectCameras(select, note, input, true);
                    }
                })
                .catch(function () {
                    /* permissions API not available for camera */
                });
        }
    }

    function buildOption(value, label) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        return option;
    }

    function resetOptions(select, currentValue) {
        select.innerHTML = '';
        select.appendChild(buildOption('', photoboothTools.getTranslation('device_default')));
        if (currentValue) {
            select.appendChild(buildOption(currentValue, currentValue));
            select.value = currentValue;
        }
    }

    function detectCameras(select, note, input, silent) {
        note.textContent = '';
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            note.textContent = 'Camera detection requires HTTPS or localhost.';
            return;
        }

        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then(function (stream) {
                stream.getTracks().forEach(function (track) {
                    track.stop();
                });
                return navigator.mediaDevices.enumerateDevices();
            })
            .then(function (devices) {
                const cameras = devices.filter(function (device) {
                    return device.kind === 'videoinput';
                });
                populateSelect(select, cameras, input.value);
            })
            .catch(function (error) {
                if (!silent) {
                    note.textContent = 'Camera permission denied — use manual entry.';
                }
                photoboothTools.console.logDev('deviceSelect: ' + error);
            });
    }

    function populateSelect(select, cameras, currentValue) {
        select.innerHTML = '';
        select.appendChild(buildOption('', photoboothTools.getTranslation('device_default')));

        let found = false;
        cameras.forEach(function (camera) {
            const label = camera.label || camera.deviceId;
            select.appendChild(buildOption(camera.deviceId, label + ' (' + camera.deviceId.slice(0, 8) + '…)'));
            if (camera.deviceId === currentValue) {
                found = true;
            }
        });

        if (currentValue && !found) {
            select.appendChild(buildOption(currentValue, '⚠ ' + currentValue.slice(0, 12) + '… (not detected)'));
        }

        select.value = currentValue || '';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
