<?php
require 'vendor/autoload.php';
use InfluxDB\Client;

header("Content-Type: application/json; charset=utf-8");

// ===============================
// KONEKSI INFLUXDB
// ===============================
$client = new Client("localhost", 8086);
$db = $client->selectDB("wave_monitoring");

// ===============================
// TIME → MILLISECOND
// ===============================
function toMs($t) {
    return $t ? strtotime($t) * 1000 : null;
}


// ===============================
// FILTER TANGGAL
// ===============================
$date = $_GET   ['date'] ?? null;

$where = "";
if($date){
    $start = $date."T00:00:00Z";
    $end   = $date."T23:59:59Z";

    $where = "AND time >= '$start' AND time <= '$end'";
}

// ===============================
// EXCLUDE DATA KORUP
// ===============================
$excludeStart = "2025-11-29T00:00:00Z";
$excludeEnd   = "2025-12-06T23:59:59Z";

$exclude = "AND time < '$excludeStart' OR time > '$excludeEnd'";



// ===============================
// MODE TABEL (UNTUK TOMBOL)
// ===============================
$type = $_GET['type'] ?? "";
$node = $_GET['node'] ?? "";

if($type && $node){

    // mapping field
    if($type == "water") $field = "h";
    else if($type == "wind") $field = "v";
    else if($type == "mdpl") $field = "m";
    else{
        echo json_encode([]);
        exit;
    }

    // mapping node
    if($node == "node1") $n = "A";
    else if($node == "node2") $n = "B";
    else{
        echo json_encode([]);
        exit;
    }



    $rows = $db->query("
        SELECT $field, time 
        FROM sensor_data 
        WHERE n='$n' $where
        ORDER BY time ASC
    ")->getPoints();

    $result = [];

    foreach($rows as $r){
        $result[] = [
            "time"  => toMs($r["time"]),
            "value" => (float)$r[$field]
        ];
    }

    echo json_encode($result);
    exit;
}


// ===============================
// QUERY DATA
// ===============================
$rawA = $db->query("SELECT h, v, m, time FROM sensor_data WHERE n='A' $where ORDER BY time ASC")->getPoints();
$rawB = $db->query("SELECT h, v, m, time FROM sensor_data WHERE n='B' $where ORDER BY time ASC")->getPoints();

$rowsA = averagePerMinute($rawA);
$rowsB = averagePerMinute($rawB);


if(!$rowsA && !$rowsB){
    echo json_encode([
        "time" => [],
        "node1" => ["water"=>[], "wind"=>[], "mdpl"=>[]],
        "node2" => ["water"=>[], "wind"=>[], "mdpl"=>[]],
        "summary" => [],
        "map" => []
    ]);
    exit;
}

// ===============================
// STATUS AIR
// ===============================
function statusAir($air) {

    if ($air <= 27) {
        return ["text"=>"Rendah", "icon"=>"🔵"];
    }

    if ($air <= 54) {
        return ["text"=>"Normal", "icon"=>"🟢"];
    }

    if ($air <= 81) {
        return ["text"=>"Siaga", "icon"=>"🟡"];
    }

    if ($air <= 108) {
        return ["text"=>"Waspada", "icon"=>"🟠"];
    }

    return ["text"=>"Bahaya", "icon"=>"🔴"];
}



function averagePerMinute($rows) {
    $bucket = [];

    foreach ($rows as $r) {
        // ambil menit (YYYY-mm-dd HH:ii)
        $minute = date('Y-m-d H:i', strtotime($r['time']));

        if (!isset($bucket[$minute])) {
            $bucket[$minute] = [
                'sum_h' => 0,
                'sum_v' => 0,
                'sum_m' => 0,
                'count' => 0,
                'time'  => strtotime($minute . ':00') * 1000
            ];
        }

        $bucket[$minute]['sum_h'] += (float)$r['h'];
        $bucket[$minute]['sum_v'] += (float)$r['v'];
        $bucket[$minute]['sum_m'] += (float)$r['m'];
        $bucket[$minute]['count']++;
    }

    $result = [];
    foreach ($bucket as $b) {
        $result[] = [
            'time' => $b['time'],
            'h' => $b['sum_h'] / $b['count'],
            'v' => $b['sum_v'] / $b['count'],
            'm' => $b['sum_m'] / $b['count']
        ];
    }

    return $result;
}


// ===============================
// TIMELINE GABUNGAN
// ===============================
$timeline = [];
foreach ($rowsA as $r) $timeline[] = $r["time"];
foreach ($rowsB as $r) $timeline[] = $r["time"];
$timeline = array_values(array_unique($timeline));
sort($timeline);

// ===============================
// MAPPING NODE A
// ===============================
$mapA = [];
foreach ($rowsA as $r) {
    $mapA[$r["time"]] = [
        "air"  => (float)$r["h"],
        "wind" => (float)$r["v"],
        "mdpl" => (float)$r["m"]
    ];
}

$A_air = $A_wind = $A_mdpl = [];
$lastA = ["air"=>0, "wind"=>0, "mdpl"=>0];

foreach ($timeline as $t) {
    if (isset($mapA[$t])) {
        $lastA = $mapA[$t];
    }
    $A_air[]  = $lastA["air"];
    $A_wind[] = $lastA["wind"];
    $A_mdpl[] = $lastA["mdpl"];
}

// ===============================
// MAPPING NODE B
// ===============================
$mapB = [];
foreach ($rowsB as $r) {
    $mapB[$r["time"]] = [
        "air"  => (float)$r["h"],
        "wind" => (float)$r["v"],
        "mdpl" => (float)$r["m"]
    ];
}

$B_air = $B_wind = $B_mdpl = [];
$lastB = ["air"=>0, "wind"=>0, "mdpl"=>0];

foreach ($timeline as $t) {
    if (isset($mapB[$t])) {
        $lastB = $mapB[$t];
    }
    $B_air[]  = $lastB["air"];
    $B_wind[] = $lastB["wind"];
    $B_mdpl[] = $lastB["mdpl"];
}

// ===============================
// DATA TERAKHIR MAP
// ===============================
$lastArow = !empty($rowsA) ? end($rowsA) : [];
$lastBrow = !empty($rowsB) ? end($rowsB) : [];

$statusA = statusAir($lastArow["h"] ?? 0);
$statusB = statusAir($lastBrow["h"] ?? 0);

$receiverTime = max(
    $lastArow["time"] ?? 0 ,
    $lastBrow["time"] ?? 0
);

echo json_encode([
    "time" => $timeline,

    "node1" => [
        "water" => $A_air,
        "wind"  => $A_wind,
        "mdpl"  => $A_mdpl
    ],

    "node2" => [
        "water" => $B_air,
        "wind"  => $B_wind,
        "mdpl"  => $B_mdpl
    ],

    // ✅ SUMMARY DI SINI
    "summary" => [
        "node1" => [
            "air"    => $lastArow["h"] ?? 0,
            "wind"   => $lastArow["v"] ?? 0,
            "status" => $statusA["text"],
            "icon"   => $statusA["icon"]
        ],
        "node2" => [
            "air"    => $lastBrow["h"] ?? 0,
            "wind"   => $lastBrow["v"] ?? 0,
            "status" => $statusB["text"],
            "icon"   => $statusB["icon"]
        ],
        "receiver" => [
            "last_time" => $receiverTime
        ]
    ],

    // ✅ MAP HANYA ISI MARKER
    "map" => [
        [
            "node"  => "Receiver",
            "lat"   => 2.334406919594398,
            "lng"   => 99.05612805766958,
            "air"   => null,
            "angin" => null,
            "mdpl"  => null,
            "time"  => null
        ],
        [
            "node"=>"Node 1",
             "lat"=>2.3406402590790085,
            "lng"=>99.05079105510993,
            "air"=>$lastArow["h"] ?? 0,
            "angin"=>$lastArow["v"] ?? 0,
            "mdpl"=>$lastArow["m"] ?? 0,
            "time"=>$lastArow["time"] ?? null
        ],
        [
            "node"=>"Node 2",
            "lat"=>2.338332955351201,
            "lng"=>99.06264575333829,
            "air"=>$lastBrow["h"] ?? 0,
            "angin"=>$lastBrow["v"] ?? 0,
            "mdpl"=>$lastBrow["m"] ?? 0,
            "time"=>$lastBrow["time"] ?? null
        ]
    ]
], JSON_PRETTY_PRINT);
