/* eslint n/no-unsupported-features/node-builtins: "off" */
/* globals csrf */
(function () {
    function initAssetUploads() {
        setupImageUploads();
        setupFontUploads();
        setupVideoUploads();
    }

    function setupImageUploads() {
        document.querySelectorAll('.adminImageSelection').forEach(function (modal) {
            const grid = modal.querySelector('.grid');
            if (!grid) {
                return;
            }
            const folder = modal.dataset.uploadFolder;
            if (!folder) {
                return;
            }
            const inputName = modal.querySelector('input[type="input"]');
            if (!inputName) {
                return;
            }
            const nameAttr = inputName.getAttribute('name');
            injectUploadArea(modal, grid, folder, nameAttr, 'image/*', function (response, wrapper) {
                const img = document.createElement('img');
                img.setAttribute('onclick', 'adminImageSelect(this, \'' + nameAttr + '\')');
                img.setAttribute('data-origin', response.path);
                img.setAttribute('class', 'w-full h-full left-0 top-0 absolute object-contain');
                img.setAttribute('src', response.url);
                img.setAttribute('title', response.url);
                wrapper.appendChild(img);
            });
        });
    }

    function setupFontUploads() {
        document.querySelectorAll('.adminFontSelection').forEach(function (modal) {
            const grid = modal.querySelector('.grid');
            if (!grid) {
                return;
            }
            const folder = modal.dataset.uploadFolder;
            if (!folder) {
                return;
            }
            const inputName = modal.querySelector('input[type="input"]');
            if (!inputName) {
                return;
            }
            const nameAttr = inputName.getAttribute('name');
            injectUploadArea(modal, grid, folder, nameAttr, '.ttf', function (response, wrapper) {
                wrapper.classList.add('w-full', 'relative', 'h-0', 'pb-2/3');
                const img = document.createElement('img');
                img.setAttribute('onclick', 'adminFontSelect(this, "' + nameAttr + '", "")');
                img.setAttribute('data-origin', response.path);
                img.setAttribute('title', response.filename);
                img.setAttribute(
                    'class',
                    'w-full h-full left-0 top-0 absolute object-contain cursor-pointer hover:shadow-lg'
                );
                img.setAttribute('src', response.preview || response.url);
                wrapper.appendChild(img);
            });
        });
    }

    function setupVideoUploads() {
        document.querySelectorAll('.adminVideoSelection').forEach(function (modal) {
            const grid = modal.querySelector('.grid');
            if (!grid) {
                return;
            }
            const folder = modal.dataset.uploadFolder;
            if (!folder) {
                return;
            }
            const inputName = modal.querySelector('input[type="input"]');
            if (!inputName) {
                return;
            }
            const nameAttr = inputName.getAttribute('name');
            injectUploadArea(modal, grid, folder, nameAttr, 'video/*', function (response, wrapper) {
                const container = document.createElement('div');
                container.classList.add('w-full');

                const inner = document.createElement('div');
                inner.classList.add('relative', 'h-0', 'pb-2/3', 'cursor-pointer', 'hover:shadow-lg');

                const video = document.createElement('video');
                video.setAttribute('onclick', 'adminVideoSelect(this, "' + nameAttr + '")');
                video.setAttribute('data-origin', response.path);
                video.setAttribute('class', 'w-full h-full left-0 top-0 absolute object-contain');
                video.setAttribute('src', response.url);
                video.setAttribute('autoplay', '');
                video.setAttribute('muted', '');
                video.setAttribute('loop', '');
                video.setAttribute('playsinline', '');
                inner.appendChild(video);
                container.appendChild(inner);

                const label = document.createElement('div');
                label.classList.add('w-full', 'text-center', 'text-xs', 'text-gray-700', 'truncate');
                label.textContent = response.filename;
                container.appendChild(label);
                wrapper.appendChild(container);
            });
        });
    }

    function injectUploadArea(modal, grid, folder, nameAttr, accept, buildThumbnail) {
        const uploadRow = document.createElement('div');
        uploadRow.classList.add('col-span-3', 'mb-4');

        const uploadWrap = document.createElement('div');
        uploadWrap.classList.add(
            'flex',
            'items-center',
            'gap-2',
            'p-3',
            'border-2',
            'border-dashed',
            'border-gray-300',
            'rounded-lg'
        );

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = accept;
        fileInput.classList.add('hidden');
        fileInput.dataset.folder = folder;
        fileInput.dataset.selectorName = nameAttr;

        const chooseBtn = document.createElement('button');
        chooseBtn.type = 'button';
        chooseBtn.classList.add(
            'h-8',
            'px-4',
            'bg-brand-1',
            'text-white',
            'text-sm',
            'rounded-full',
            'hover:opacity-90'
        );
        chooseBtn.textContent = 'Upload file';
        chooseBtn.addEventListener('click', function () {
            fileInput.click();
        });

        const statusEl = document.createElement('span');
        statusEl.classList.add('text-xs', 'text-gray-500', 'hidden');

        uploadWrap.appendChild(fileInput);
        uploadWrap.appendChild(chooseBtn);
        uploadWrap.appendChild(statusEl);
        uploadRow.appendChild(uploadWrap);

        fileInput.addEventListener('change', function () {
            if (!fileInput.files.length) {
                return;
            }
            const file = fileInput.files[0];
            const targetFolder = fileInput.dataset.folder;

            statusEl.textContent = 'Uploading...';
            statusEl.classList.remove('hidden');
            chooseBtn.disabled = true;

            uploadFile(targetFolder, file, function (err, response) {
                chooseBtn.disabled = false;
                if (err) {
                    statusEl.textContent = err;
                    statusEl.classList.add('text-red-600');
                    return;
                }
                statusEl.classList.add('hidden');

                const wrapper = document.createElement('div');
                wrapper.classList.add('w-full');
                const filenameLabel = document.createElement('div');
                filenameLabel.classList.add('w-full', 'text-center', 'text-xs', 'text-gray-700', 'truncate');
                filenameLabel.textContent = response.filename;
                wrapper.appendChild(filenameLabel);
                buildThumbnail(response, wrapper);
                grid.insertBefore(wrapper, uploadRow.nextSibling);
                fileInput.value = '';
            });
        });

        if (grid.firstChild) {
            grid.insertBefore(uploadRow, grid.firstChild);
        } else {
            grid.appendChild(uploadRow);
        }
    }

    function uploadFile(folder, file, callback) {
        const formData = new FormData();
        formData.append('folder', folder);
        formData.append('file', file);
        formData.append('csrf', csrf.token);

        fetch('../api/uploadAsset.php', {
            method: 'POST',
            body: formData
        })
            .then(function (res) {
                return res.json().then(function (data) {
                    if (!res.ok) {
                        callback(data.error || 'Upload failed', null);
                    } else {
                        callback(null, data);
                    }
                });
            })
            .catch(function () {
                callback('Network error during upload', null);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAssetUploads);
    } else {
        initAssetUploads();
    }
})();
