/* eslint n/no-unsupported-features/node-builtins: "off" */
/* globals csrf */
(function () {
    function initAssetUploads() {
        setupImageUploads()
        setupFontUploads()
        setupVideoUploads()
    }

    function setupImageUploads() {
        document.querySelectorAll('.adminImageSelection').forEach(function (modal) {
            const grid = modal.querySelector('.grid')
            if (!grid) {
                return
            }
            const folder = modal.dataset.uploadFolder
            if (!folder) {
                return
            }
            const inputName = modal.querySelector('input[type="input"]')
            if (!inputName) {
                return
            }
            const nameAttr = inputName.getAttribute('name')
            injectUploadArea(modal, grid, folder, nameAttr, 'image/*')
        })
    }

    function setupFontUploads() {
        document.querySelectorAll('.adminFontSelection').forEach(function (modal) {
            const grid = modal.querySelector('.grid')
            if (!grid) {
                return
            }
            const folder = modal.dataset.uploadFolder
            if (!folder) {
                return
            }
            const inputName = modal.querySelector('input[type="input"]')
            if (!inputName) {
                return
            }
            const nameAttr = inputName.getAttribute('name')
            injectUploadArea(modal, grid, folder, nameAttr, '.ttf')
        })
    }

    function setupVideoUploads() {
        document.querySelectorAll('.adminVideoSelection').forEach(function (modal) {
            const grid = modal.querySelector('.grid')
            if (!grid) {
                return
            }
            const folder = modal.dataset.uploadFolder
            if (!folder) {
                return
            }
            const inputName = modal.querySelector('input[type="input"]')
            if (!inputName) {
                return
            }
            const nameAttr = inputName.getAttribute('name')
            injectUploadArea(modal, grid, folder, nameAttr, 'video/*')
        })
    }

    function injectUploadArea(modal, grid, folder, nameAttr, accept) {
        const uploadRow = document.createElement('div')
        uploadRow.classList.add('col-span-3', 'mb-4')

        const uploadWrap = document.createElement('div')
        uploadWrap.classList.add('flex', 'items-center', 'gap-2', 'p-3', 'border-2', 'border-dashed', 'border-gray-300', 'rounded-lg')

        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.accept = accept
        fileInput.classList.add('hidden')
        fileInput.dataset.folder = folder
        fileInput.dataset.selectorName = nameAttr

        const chooseBtn = document.createElement('button')
        chooseBtn.type = 'button'
        chooseBtn.classList.add('h-8', 'px-4', 'bg-brand-1', 'text-white', 'text-sm', 'rounded-full', 'hover:opacity-90')
        chooseBtn.textContent = 'Upload file'
        chooseBtn.addEventListener('click', function () {
            fileInput.click()
        })

        const statusEl = document.createElement('span')
        statusEl.classList.add('text-xs', 'text-gray-500', 'hidden')

        uploadWrap.appendChild(fileInput)
        uploadWrap.appendChild(chooseBtn)
        uploadWrap.appendChild(statusEl)
        uploadRow.appendChild(uploadWrap)

        fileInput.addEventListener('change', function () {
            if (!fileInput.files.length) {
                return
            }
            const file = fileInput.files[0]
            const targetFolder = fileInput.dataset.folder

            statusEl.textContent = 'Uploading...'
            statusEl.classList.remove('hidden')
            chooseBtn.disabled = true

            uploadFile(targetFolder, file, function (err) {
                chooseBtn.disabled = false
                if (err) {
                    statusEl.textContent = err
                    statusEl.classList.add('text-red-600')
                    return
                }

                statusEl.textContent = 'Uploaded!'
                statusEl.classList.add('text-green-600')
                fileInput.value = ''

                fetchFolderList(folder, nameAttr, function (htmlErr, html) {
                    if (htmlErr) {
                        return
                    }
                    // Close modal, replace grid content, reopen
                    modal.classList.remove('isOpen')
                    replaceGridItems(grid, uploadRow, html)
                    modal.classList.add('isOpen')
                    statusEl.classList.add('hidden')
                    statusEl.classList.remove('text-green-600')
                })
            })
        })

        if (grid.firstChild) {
            grid.insertBefore(uploadRow, grid.firstChild)
        } else {
            grid.appendChild(uploadRow)
        }
    }

    function replaceGridItems(grid, uploadRow, newItemsHtml) {
        // Remove all existing file items (keep the upload row and col-span-3 headings)
        const children = grid.querySelectorAll(':scope > .w-full')
        children.forEach(function (child) {
            grid.removeChild(child)
        })
        // Insert new items after the upload row
        const wrapper = document.createElement('div')
        wrapper.innerHTML = newItemsHtml
        while (wrapper.firstChild) {
            grid.insertBefore(wrapper.firstChild, uploadRow.nextSibling)
        }
    }

    function fetchFolderList(folder, nameAttr, callback) {
        fetch('../api/uploadAsset.php?action=list&folder=' + encodeURIComponent(folder) + '&name=' + encodeURIComponent(nameAttr) + '&csrf=' + csrf.token).then(function (res) {
            return res.json().then(function (data) {
                if (!res.ok || !data.success) {
                    callback(data.error || 'Failed to refresh list', null)
                } else {
                    callback(null, data.html)
                }
            })
        }).catch(function () {
            callback('Network error', null)
        })
    }

    function uploadFile(folder, file, callback) {
        const formData = new FormData()
        formData.append('folder', folder)
        formData.append('file', file)
        formData.append('csrf', csrf.token)

        fetch('../api/uploadAsset.php', {
            method: 'POST',
            body: formData
        })
            .then(function (res) {
                return res.json().then(function (data) {
                    if (!res.ok) {
                        callback(data.error || 'Upload failed')
                    } else {
                        callback(null)
                    }
                })
            })
            .catch(function () {
                callback('Network error during upload')
            })
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAssetUploads)
    } else {
        initAssetUploads()
    }
})()
