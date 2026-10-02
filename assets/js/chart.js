document.addEventListener("DOMContentLoaded", () => {

let isFilterActive = false;
let autoRefresh = null;

/* ======================================
   STATUS AIR (SUMMARY)
====================================== */
function getStatusAir(air) {
    if (air <= 27) return "🔵 Rendah";
    if (air <= 54) return "🟢 Normal";
    if (air <= 81) return "🟡 Siaga";
    if (air <= 108) return "🟠 Waspada";
    return "🔴 Bahaya";
}

// ======================================
// FORMAT TIMESTAMP
// ======================================
function formatTimestamp(timeArray) {
    if (!Array.isArray(timeArray)) return [];
    return timeArray.map(ts => {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return "-";
        return `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    });
}

// ======================================
// SAFE HELPERS
// (diambil dari app.js — mencegah chart crash saat API mengirim
// data null/kosong/format tidak terduga)
// ======================================
function safeArray(a, length) {
    if (!Array.isArray(a)) return Array.from({ length: length || 0 }, () => null);
    return a;
}

function lastNonNull(arr) {
    if (!Array.isArray(arr)) return null;
    for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] !== null && arr[i] !== undefined && !Number.isNaN(arr[i])) return arr[i];
    }
    return null;
}

// ======================================
// BUAT CHART
// ======================================
function buatChart(id, label, color, isWind = false) {
    const ctx = document.getElementById(id);
    if (!ctx) {
        console.warn(`Canvas #${id} tidak ditemukan di HTML, chart dilewati.`);
        return null;
    }
    const isMDPL = label.includes("MDPL");

    return new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                borderWidth: 2,
                pointRadius: isMDPL ? 2 : 0,
                pointHoverRadius: isMDPL ? 5 : 0,
                pointBackgroundColor: color,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            devicePixelRatio: 2,
            plugins: {
                tooltip: {
                    enabled: true,
                    backgroundColor: "#111827",
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    titleFont: { size: 14, weight: "700" },
                    bodyFont: { size: 16, weight: "800" },
                    callbacks: {
                        label: function (ctx) {
                            const val = Number(ctx.raw);
                            if (isNaN(val)) return "Data tidak tersedia";
                            if (isMDPL) return `MDPL: ${val.toFixed(1)} m`;
                            if (isWind) return `Angin: ${val.toFixed(2)} m/s`;
                            return `Air: ${val.toFixed(1)} cm`;
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { maxRotation: 0, font: { size: 11 } } },
                y: isWind
                    ? { min: 0, max: 12, ticks: { stepSize: 1, font: { size: 12 } } }
                    : { ticks: { font: { size: 12 } } }
            }
        }
    });
}

// ======================================
// INIT CHART INSTANCES
// ======================================
const chartK1 = buatChart("chartKetinggian1", "Air Node 1", "blue");
const chartA1 = buatChart("chartAngin1", "Angin Node 1", "green", true);
const chartK2 = buatChart("chartKetinggian2", "Air Node 2", "blue");
const chartA2 = buatChart("chartAngin2", "Angin Node 2", "green", true);
const chartM1 = buatChart("chartMDPL1", "MDPL Node 1", "purple");
const chartM2 = buatChart("chartMDPL2", "MDPL Node 2", "purple");

// ======================================
// UPDATE 1 CHART (aman walau chart null / data null)
// ======================================
function updateChart(chart, labels, data) {
    if (!chart) return; // canvas-nya tidak ada di halaman ini, skip diam-diam
    chart.data.labels = Array.isArray(labels) ? labels : [];
    chart.data.datasets[0].data = Array.isArray(data) ? data : [];
    chart.update('none');
}

// ======================================
// LOAD REALTIME (dengan safe-fallback)
// ======================================
async function loadRealtime() {
    if (isFilterActive) return;

    try {
        const res = await fetch("data_api.php", { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();

        const timeArr = Array.isArray(json.time) ? json.time : [];
        const labels = formatTimestamp(timeArr);
        const len = labels.length;

        const n1_water = safeArray(json.node1?.water, len);
        const n1_wind  = safeArray(json.node1?.wind, len);
        const n1_mdpl  = safeArray(json.node1?.mdpl, len);

        const n2_water = safeArray(json.node2?.water, len);
        const n2_wind  = safeArray(json.node2?.wind, len);
        const n2_mdpl  = safeArray(json.node2?.mdpl, len);

        updateChart(chartK1, labels, n1_water);
        updateChart(chartA1, labels, n1_wind);
        updateChart(chartK2, labels, n2_water);
        updateChart(chartA2, labels, n2_wind);
        updateChart(chartM1, labels, n1_mdpl);
        updateChart(chartM2, labels, n2_mdpl);

        // Nilai MDPL terakhir (opsional — hanya ditulis kalau elemennya ada di HTML)
        const mdplEl1 = document.getElementById("mdplNode1");
        const mdplEl2 = document.getElementById("mdplNode2");
        if (mdplEl1) {
            const last1 = lastNonNull(n1_mdpl);
            mdplEl1.innerText = last1 !== null ? `${last1} m` : "N/A";
        }
        if (mdplEl2) {
            const last2 = lastNonNull(n2_mdpl);
            mdplEl2.innerText = last2 !== null ? `${last2} m` : "N/A";
        }

    } catch (err) {
        console.error("❌ Gagal memuat data realtime:", err);
        // Jangan crash — kosongkan chart daripada biarkan data basi tampil.
        updateChart(chartK1, [], []);
        updateChart(chartA1, [], []);
        updateChart(chartK2, [], []);
        updateChart(chartA2, [], []);
        updateChart(chartM1, [], []);
        updateChart(chartM2, [], []);
    }
}

// ======================================
// FILTER TANGGAL
// ======================================
window.updateCharts = function (data) {
    isFilterActive = true;
    clearInterval(autoRefresh);

    const timeArr = Array.isArray(data.time) ? data.time : [];
    const labels = formatTimestamp(timeArr);
    const len = labels.length;

    updateChart(chartK1, labels, safeArray(data.node1?.water, len));
    updateChart(chartA1, labels, safeArray(data.node1?.wind, len));
    updateChart(chartK2, labels, safeArray(data.node2?.water, len));
    updateChart(chartA2, labels, safeArray(data.node2?.wind, len));
    updateChart(chartM1, labels, safeArray(data.node1?.mdpl, len));
    updateChart(chartM2, labels, safeArray(data.node2?.mdpl, len));

    alert("✅ Grafik tanggal berhasil ditampilkan");
};

// ======================================
// MODAL TABEL DETAIL
// ======================================
window.showTable = function (type, node) {
    let tanggal = document.getElementById("filterDate")?.value;

    let url = `data_api.php?type=${type}&node=${node}`;
    if (tanggal) url += `&date=${tanggal}`;

    $("#dataModal").modal("show");

    document.getElementById("modalTitle").innerText = "Loading...";
    document.getElementById("modalTable").innerHTML =
        `<tr><td colspan="2" class="text-center">⏳ Loading...</td></tr>`;

    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        })
        .then(data => {
            if (!Array.isArray(data)) data = [];

            let html = "";
            if (data.length === 0) {
                html = `<tr><td colspan="2" class="text-center">Tidak ada data</td></tr>`;
            } else {
                data.reverse().forEach(r => {
                    let waktu = new Date(r.time).toLocaleString("id-ID");
                    let unit = type === "water" ? "cm" : type === "wind" ? "m/s" : "m";
                    html += `
                      <tr>
                        <td>${waktu}</td>
                        <td><b>${r.value}</b> ${unit}</td>
                      </tr>`;
                });
            }

            document.getElementById("modalTitle").innerText =
                `📊 DATA ${type.toUpperCase()} ${node.toUpperCase()}`;
            document.getElementById("modalTable").innerHTML = html;
        })
        .catch(err => {
            console.error("Fetch table error:", err);
            alert("Gagal ambil data!");
        });
};

console.log("chart.js loaded");

// ======================================
// START
// ======================================
loadRealtime();
autoRefresh = setInterval(loadRealtime, 10000);

});