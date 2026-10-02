<?php
require __DIR__ . '/vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/* ===============================
   KONFIGURASI GOOGLE SHEETS
================================ */

// ID spreadsheet (dari link kamu)
$spreadsheetId = "1nNQtGXF9Wzx87MslEQRrHdlpVTq7DMonx_wEk1PFtLE";

// GID sheet (biasanya 0)
$gid = "0";

// URL export CSV (HARUS PUBLIK)
$url = "https://docs.google.com/spreadsheets/d/$spreadsheetId/export?format=csv&gid=$gid";

/* ===============================
   AMBIL CSV
================================ */
$csv = @file_get_contents($url);
if ($csv === false) {
    http_response_code(500);
    exit("❌ Gagal mengambil data Google Sheets. Pastikan sheet PUBLIC.");
}

/* ===============================
   CSV → ARRAY
================================ */
$rows = array_map("str_getcsv", explode("\n", trim($csv)));

/* ===============================
   BUAT EXCEL
================================ */
$spreadsheet = new Spreadsheet();
$sheet = $spreadsheet->getActiveSheet();

$rowNum = 1;
foreach ($rows as $row) {
    $col = 'A';
    foreach ($row as $cell) {
        $sheet->setCellValue($col.$rowNum, $cell);
        $col++;
    }
    $rowNum++;
}

/* ===============================
   DOWNLOAD
================================ */
$filename = "Dataset_Monitoring_Danau_Toba_" . date("Y-m-d_H-i-s") . ".xlsx";

header("Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
header("Content-Disposition: attachment; filename=\"$filename\"");
header("Cache-Control: max-age=0");

$writer = new Xlsx($spreadsheet);
$writer->save("php://output");
exit;
