<?php

require_once __DIR__ . '/../admin/admin_boot.php';

use Photobooth\Enum\FolderEnum;
use Photobooth\Service\LoggerService;
use Photobooth\Utility\PathUtility;
use ZipArchive;

header('Content-Type: application/json');
$logger = LoggerService::getInstance()->getLogger('main');
$logger->debug(basename($_SERVER['PHP_SELF']));

checkCsrforFail($_GET);

$type = isset($_GET['type']) && is_string($_GET['type']) ? $_GET['type'] : '';

if (!in_array($type, ['processed', 'raw'], true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid type']);
    exit();
}

if ($type === 'processed') {
    $dir = FolderEnum::IMAGES->absolute();
    $label = 'processed';
} else {
    $dir = FolderEnum::TEMP->absolute();
    $label = 'raw';
}

$files = [];
if (is_dir($dir)) {
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
    );
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $ext = strtolower($file->getExtension());
            if (in_array($ext, ['jpg', 'jpeg'], true)) {
                $files[] = $file->getRealPath();
            }
        }
    }
}

if (empty($files)) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'No photos to download']);
    exit();
}

$tempZip = tempnam(sys_get_temp_dir(), 'photobooth_' . $label . '_');
$zip = new ZipArchive();
if ($zip->open($tempZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Unable to create archive']);
    exit();
}

foreach ($files as $file) {
    $zip->addFile($file, basename($file));
}

$zip->close();

$downloadName = 'photobooth_' . $label . '_' . date('Ymd_His') . '.zip';

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $downloadName . '"');
header('Content-Length: ' . filesize($tempZip));
header('Pragma: no-cache');
header('Expires: 0');

readfile($tempZip);

@unlink($tempZip);
exit();
