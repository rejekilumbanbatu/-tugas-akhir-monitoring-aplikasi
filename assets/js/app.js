// ==============================
// FETCH DATA API → UPDATE CHART & UI
// ==============================

// Safe formatter: jika timeArray kosong maka kembalikan []
function safeFormatTimestamp(timeArray) {
    try {
        return formatTimestamp(timeArray);
    } catch (e) {
        return [];
    }
}

function safeArray(a, length) {
    // jika a bukan array, buat array length dengan null
    if (!Array.isArray(a)) return Array.from({length}, ()=>null);
    return a;
}

function lastNonNull(arr) {
    if (!Array.isArray(arr)) return null;
    for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] !== null && arr[i] !== undefined && !Number.isNaN(arr[i])) return arr[i];
    }
    return null;
}

async function updateChartsFromAPI() {
    try {
        const res = await fetch("data_api.php", { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        // jika tidak ada data.time, kosongkan chart
        const timeArr = Array.isArray(data.time) ? data.time : [];
        const labels = safeFormatTimestamp(timeArr);

        // Ambil arrays, berikan fallback dengan panjang labels
        const len = labels.length || 0;

        const n1_water = safeArray(data.node1?.water, len);
        const n1_wind  = safeArray(data.node1?.wind, len);
        const n1_mdpl  = safeArray(data.node1?.mdpl, len);

        const n2_water = safeArray(data.node2?.water, len);
        const n2_wind  = safeArray(data.node2?.wind, len);
        const n2_mdpl  = safeArray(data.node2?.mdpl, len);

        // Update charts (cek jika chart ada)
        updateChart(chartK1, labels, n1_water);
        updateChart(chartA1, labels, n1_wind);

        updateChart(chartK2, labels, n2_water);
        updateChart(chartA2, labels, n2_wind);

        updateChartMDPL(labels, n1_mdpl, n2_mdpl);

        // Update MDPL text: ambil nilai terakhir non-null, tampilkan "N/A" jika tidak ada
        const lastMdpl1 = lastNonNull(n1_mdpl);
        const lastMdpl2 = lastNonNull(n2_mdpl);

        document.getElementById("mdplNode1").innerText = (lastMdpl1 !== null) ? `${lastMdpl1} m` : "N/A";
        document.getElementById("mdplNode2").innerText = (lastMdpl2 !== null) ? `${lastMdpl2} m` : "N/A";

        console.log("✔ Grafik & MDPL diperbarui");

    } catch (err) {
        console.error("❌ Gagal fetch/update:", err);

        // kalau error, jangan crash: kosongkan chart labels/data supaya tidak error
        updateChart(chartK1, [], []);
        updateChart(chartA1, [], []);
        updateChart(chartK2, [], []);
        updateChart(chartA2, [], []);
        updateChartMDPL([], [], []);
        document.getElementById("mdplNode1").innerText = "N/A";
        document.getElementById("mdplNode2").innerText = "N/A";
    }
}

// AUTO REFRESH
updateChartsFromAPI();
setInterval(updateChartsFromAPI, 10000);
