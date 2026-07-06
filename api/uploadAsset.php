<?php

require_once __DIR__ . '/../admin/admin_boot.php';

use Photobooth\FileUploader;
use Photobooth\Service\LoggerService;
use Photobooth\Service\LanguageService;
use Photobooth\Utility\FontUtility;
use Photobooth\Utility\ImageUtility;
use Photobooth\Utility\PathUtility;
use Photobooth\Utility\VideoUtility;

header('Content-Type: application/json');

// --- GET: list files in a folder ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = isset($_GET['action']) && is_string($_GET['action']) ? $_GET['action'] : '';

    if ($action !== 'list') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        exit();
    }

    checkCsrforFail($_GET);

    $folder = isset($_GET['folder']) && is_string($_GET['folder']) ? trim($_GET['folder']) : '';
    $name = isset($_GET['name']) && is_string($_GET['name']) ? $_GET['name'] : '';

    if ($folder === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing folder parameter']);
        exit();
    }

    $absolutePath = PathUtility::getAbsolutePath($folder);
    $html = '';

    if (str_starts_with($folder, 'private/images/')) {
        $files = ImageUtility::getImagesFromPath($absolutePath, false);
        foreach ($files as $file) {
            $publicPath = PathUtility::getPublicPath($file);
            $relativePath = str_replace(PathUtility::getRootPath(), '', $file);
            $filename = basename($file);
            $escapedName = htmlspecialchars($name, ENT_QUOTES);
            $escapedPath = htmlspecialchars($relativePath, ENT_QUOTES);
            $escapedSrc = htmlspecialchars((string) $publicPath, ENT_QUOTES);
            $escapedTitle = htmlspecialchars((string) $publicPath, ENT_QUOTES);
            $escapedFilename = htmlspecialchars($filename, ENT_QUOTES);

            $html .= '
                <div class="w-full">
                    <div class="relative h-0 pb-2/3 cursor-pointer hover:shadow-lg">
                        <img onclick="adminImageSelect(this, \'' . $escapedName . '\')"
                             data-origin="' . $escapedPath . '"
                             class="w-full h-full left-0 top-0 absolute object-contain"
                             src="' . $escapedSrc . '"
                             title="' . $escapedTitle . '">
                    </div>
                    <div class="w-full text-center text-xs text-gray-700 truncate">
                        ' . $escapedFilename . '
                    </div>
                </div>
            ';
        }
    } elseif ($folder === 'private/fonts') {
        $files = FontUtility::getFontsFromPath($absolutePath, false);
        foreach ($files as $fontName => $fontPath) {
            $publicPath = PathUtility::getPublicPath($fontPath);
            $origin = str_replace(PathUtility::getRootPath(), '', $fontPath);
            $origin = ltrim($origin, '/');
            $escapedOrigin = htmlspecialchars($origin, ENT_QUOTES);
            $escapedFontName = htmlspecialchars((string) $fontName, ENT_QUOTES);
            $imageAttributes = [
                'onClick' => 'adminFontSelect(this, "' . $name . '", "")',
                'data-origin' => $escapedOrigin,
                'title' => $escapedFontName,
                'class' => 'w-full h-full left-0 top-0 absolute object-contain cursor-pointer hover:shadow-lg',
            ];
            $html .= '<div class="w-full relative h-0 pb-2/3">' . FontUtility::getFontPreviewImage(fontPath: $publicPath, attributes: $imageAttributes) . '</div>';
        }
    } elseif ($folder === 'private/videos/background') {
        $files = VideoUtility::getVideosFromPath($absolutePath, false);
        foreach ($files as $file) {
            $relativePath = str_replace(PathUtility::getRootPath(), '', $file);
            $filename = basename($file);
            $escapedName = htmlspecialchars($name, ENT_QUOTES);
            $escapedPath = htmlspecialchars($relativePath, ENT_QUOTES);
            $escapedFilename = htmlspecialchars($filename, ENT_QUOTES);

            $html .= '
                <div class="w-full">
                    <div class="relative h-0 pb-2/3 cursor-pointer hover:shadow-lg">
                        <video onclick="adminVideoSelect(this, \'' . $escapedName . '\')"
                               data-origin="' . $escapedPath . '"
                               class="w-full h-full left-0 top-0 absolute object-contain"
                               src="' . $relativePath . '"
                               autoplay muted loop playsinline></video>
                    </div>
                    <div class="w-full text-center text-xs text-gray-700 truncate">
                        ' . $escapedFilename . '
                    </div>
                </div>
            ';
        }
    }

    echo json_encode(['success' => true, 'html' => $html]);
    exit();
}

// --- POST: upload a file ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// CSRF validation: accept token from form data
checkCsrforFail($_POST);

$logger = LoggerService::getInstance()->getLogger('main');
$logger->debug(basename($_SERVER['PHP_SELF']));

$folder = isset($_POST['folder']) && is_string($_POST['folder']) ? trim($_POST['folder']) : '';

if ($folder === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing folder parameter']);
    exit();
}

if (empty($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No file uploaded']);
    exit();
}

// Normalize single file upload to match FileUploader's expected multiple-file format
$uploadedFiles = [
    'name' => [$_FILES['file']['name']],
    'tmp_name' => [$_FILES['file']['tmp_name']],
    'error' => [$_FILES['file']['error']],
    'size' => [$_FILES['file']['size']],
    'type' => [$_FILES['file']['type']],
];

$fileUploader = new FileUploader($folder, $uploadedFiles, $logger);
$result = $fileUploader->uploadFiles();

// Build response
if ($result['success'] && count($result['uploadedFiles']) > 0) {
    $filename = $result['uploadedFiles'][0];
    $filePath = $folder . '/' . $filename;
    $publicUrl = PathUtility::getPublicPath($filePath);

    $response = [
        'success' => true,
        'path' => $filePath,
        'url' => $publicUrl,
        'filename' => $filename,
    ];

    // For fonts, generate a base64 preview image
    if ($folder === 'private/fonts') {
        $previewHtml = FontUtility::getFontPreviewImage(fontPath: $filePath);
        if (preg_match('/src="([^"]+)"/', $previewHtml, $matches)) {
            $response['preview'] = $matches[1];
        }
    }

    echo json_encode($response);
    exit();
}

$firstError = '';
foreach ($result['errors'] as $key => $msg) {
    $firstError = $msg;
    break;
}

if ($firstError === '') {
    $firstError = $result['message'] ?? 'Upload failed';
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => $firstError]);
