<?php

require_once __DIR__ . '/../admin/admin_boot.php';

use Photobooth\FileUploader;
use Photobooth\Service\LoggerService;
use Photobooth\Service\LanguageService;
use Photobooth\Utility\FontUtility;
use Photobooth\Utility\PathUtility;

header('Content-Type: application/json');

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
