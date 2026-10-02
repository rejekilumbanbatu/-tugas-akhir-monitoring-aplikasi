// ==============================
// SETUP MAP
// ==============================
const map = L.map('mapid').setView([2.338, 99.056], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap'
}).addTo(map);

// ==============================
// ICON
// ==============================
const iconSize = [40, 40];

const iconNormal = L.icon({
    iconUrl: 'assets/icons/node1.png',
    iconSize,
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
});

const iconWarning = L.icon({
    iconUrl: 'assets/icons/node2.png',
    iconSize,
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
});

const iconDanger = L.icon({
    iconUrl: 'assets/icons/node2.png',
    iconSize,
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
});

const iconReceiver = L.icon({
    iconUrl: 'assets/icons/receiver.png',
    iconSize,
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
});

// ==============================
// STORAGE
// ==============================
const markers = {};
let boundsInitialized = false;
let links = [];

// ==============================
// UTIL
// ==============================
function fmtTime(ms) {
    if (!ms) return "N/A";
    const d = new Date(Number(ms));
    return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("id-ID");
}

function getNodeIcon(level, key) {
    if (key === "receiver") return iconReceiver;
    if (level > 150) return iconDanger;
    if (level > 120) return iconWarning;
    return iconNormal;
}

// ==============================
// LOAD MAP DATA
// ==============================
async function loadMapData() {
    try {
        const res = await fetch("data_api.php", { cache: "no-store" });
        const json = await res.json();
        if (!json.map) return;

        const bounds = [];
        let receiverPos = null;

        // hapus garis lama
        links.forEach(l => map.removeLayer(l));
        links = [];

        json.map.forEach(item => {
            const key = item.node.toLowerCase().replace(/\s+/g, '_');
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lng);
            if (isNaN(lat) || isNaN(lng)) return;

            const icon = getNodeIcon(item.air ?? 0, key);

            let popup = `
                <b>${item.node}</b><br>
                🌊 Air: ${item.air ?? "-"} cm<br>
                🍃 Angin: ${item.angin ?? "-"} m/s<br>
                🏔 MDPL: ${item.mdpl ?? "-"} m<br>
                ⏱ ${fmtTime(item.time)}
            `;

            if (!markers[key]) {
                markers[key] = L.marker([lat, lng], { icon }).addTo(map);
            } else {
                markers[key].setLatLng([lat, lng]).setIcon(icon);
            }

            markers[key].bindPopup(popup);
            bounds.push([lat, lng]);

            if (key === "receiver") receiverPos = [lat, lng];
        });

        // garis node ke receiver
        if (receiverPos) {
            Object.keys(markers).forEach(k => {
                if (k !== "receiver") {
                    links.push(
                        L.polyline(
                            [markers[k].getLatLng(), receiverPos],
                            { color: '#007bff', dashArray: '5,5' }
                        ).addTo(map)
                    );
                }
            });
        }

        if (!boundsInitialized && bounds.length) {
            map.fitBounds(bounds, { padding: [60, 60] });
            boundsInitialized = true;
        }

    } catch (e) {
        console.error("Map error:", e);
    }
}

// ==============================
// INIT
// ==============================
loadMapData();
setInterval(loadMapData, 10000);
