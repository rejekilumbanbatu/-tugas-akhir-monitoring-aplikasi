<?php
// ===============================
// KONFIGURASI GOOGLE SHEETS
// ===============================
$spreadsheetId = "1nNQtGXF9Wzx87MslEQRrHdlpVTq7DMonx_wEk1PFtLE";
$gid = "0";

// Export CSV publik
$url = "https://docs.google.com/spreadsheets/d/$spreadsheetId/export?format=csv&gid=$gid";

// Ambil CSV
$csv = @file_get_contents($url);
if ($csv === false) {
    http_response_code(500);
    exit("❌ Gagal mengambil data Google Sheets (pastikan PUBLIC)");
}

// ===============================
// FORCE DOWNLOAD CSV
// ===============================
$filename = "Dataset_Danau_Toba_" . date("Y-m-d_H-i-s") . ".csv";

header("Content-Type: text/csv; charset=utf-8");
header("Content-Disposition: attachment; filename=\"$filename\"");
header("Cache-Control: no-store");

echo $csv;
exit;
