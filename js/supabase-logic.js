// 1. Конфігурація Supabase
const SUPABASE_URL = 'https://asfsvpwmyeuxsvjhstwy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FhsifNSIoMPstKBrhy2UPQ_tZmCgGSj';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Масив для зберігання активних маркерів на карті
window.currentStatusMarkers = [];

// --- 1. ФУНКЦІЯ ЗАВАНТАЖЕННЯ МАРКЕРІВ ---
window.loadUserMarkers = async function(townSlug) {
    const cleanSlug = townSlug.trim().toLowerCase();

    // 1. Спочатку малюємо те, що вже є в пам'яті телефону (миттєво)
    await renderAllLocalMarkers(cleanSlug);

    // 2. Якщо є інтернет, викачуємо свіжі дані з Supabase
    if (navigator.onLine) {
        const { data, error } = await supabaseClient
            .from('markers')
            .select('*')
            .eq('town_slug', cleanSlug);

        if (!error && data) {
            // Очищаємо локальні синхронізовані дані перед оновленням
            await db.markers.where('town_slug').equals(cleanSlug).and(m => m.is_synced === 1).delete();

            for (let m of data) {
                await db.markers.add({
                    ...m,
                    is_synced: 1,
                    remote_id: m.id // зберігаємо оригінальний ID з бази
                });
            }
            // Перемальовуємо вже зі свіжими даними
            await renderAllLocalMarkers(cleanSlug);
        }
    }
};

// --- 2. ФУНКЦІЯ МАЛЮВАННЯ СМАЙЛА ---
function renderEmojiMarker(data) {
    const el = document.createElement('div');
    el.className = 'emoji-marker';

    let emoji = '❌';
    let statusText = 'Нема вдома';
    let shadowColor = 'rgba(0,123,255,0.4)';

    if (data.type === 'stop') {
        emoji = '🛑';
        statusText = 'Не заходити';
        shadowColor = 'rgba(255,0,0,0.4)';
    } else if (data.type === 'visit') {
        emoji = '✅';
        statusText = 'Повторний візит';
        shadowColor = 'rgba(0,255,0,0.4)';
    }

    el.innerText = emoji;
    el.style.fontSize = '32px';
    el.style.width = '40px';
    el.style.height = '40px';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.cursor = 'pointer';
    el.style.filter = `drop-shadow(0 2px 4px ${shadowColor})`;

    const commentHtml = data.comment
        ? `<p style="font-size: 13px; color: #444; background: #fdfdfd; padding: 8px; border-radius: 6px; border: 1px dashed #ccc; margin: 0 0 12px 0; font-style: italic; line-height: 1.4;">"${data.comment}"</p>`
        : '';

    // ВИЗНАЧАЄМО ID ДЛЯ ВИДАЛЕННЯ:
    // Якщо є remote_id (вже синхронізовано), беремо його.
    // Якщо немає, використовуємо локальний id з префіксом.
    const displayId = data.remote_id || (data.id && String(data.id).startsWith('local-') ? data.id : 'local-' + data.id);

    const marker = new mapboxgl.Marker(el)
        .setLngLat([data.lng, data.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="text-align: center; padding: 5px; min-width: 150px; font-family: sans-serif;">
                <p style="margin: 0 0 10px 0;">
                    <span style="font-size: 18px;">${emoji}</span>
                    <b>${statusText}</b>
                </p>
                ${commentHtml}
                <button onclick="window.deleteMarkerFromDB('${displayId}')"
                        style="color: white; background: #ff4d4d; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-weight: bold; width: 100%;">
                    Видалити
                </button>
            </div>
        `))
        .addTo(map);

    window.currentStatusMarkers.push(marker);
}

// --- 3. ФУНКЦІЯ ЗБЕРЕЖЕННЯ ---
window.saveMarkerToDB = async function(lng, lat, type, comment = "") {
    const urlParams = new URLSearchParams(window.location.search);
    const townSlug = urlParams.get('town') || 'berezhnytsia';

    const newMarker = {
        lng: parseFloat(lng),
        lat: parseFloat(lat),
        type: type,
        comment: comment,
        town_slug: townSlug,
        is_synced: 0,
        created_at: new Date().toISOString()
    };

    const localId = await db.markers.add(newMarker);

    const activePopups = document.getElementsByClassName('mapboxgl-popup');
    if (activePopups[0]) activePopups[0].remove();

    renderEmojiMarker({ ...newMarker, id: 'local-' + localId });
    window.syncOfflineData();
};

// --- 4. ФУНКЦІЯ ВИДАЛЕННЯ ---
window.deleteMarkerFromDB = async function(markerId) {
    if (!confirm("Видалити цю відмітку?")) return;

    // ВИДАЛЕННЯ З DEXIE
    if (String(markerId).startsWith('local-')) {
        const idToDel = parseInt(markerId.replace('local-', ''));
        await db.markers.delete(idToDel);
    } else {
        // Видаляємо за remote_id
        await db.markers.where('remote_id').equals(parseInt(markerId)).delete();

        // ВИДАЛЕННЯ З SUPABASE (тільки якщо є сесія та інтернет)
        if (navigator.onLine) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                const { error } = await supabaseClient
                    .from('markers')
                    .delete()
                    .eq('id', markerId);
                if (error) console.error("Помилка видалення на сервері:", error.message);
            } else {
                alert("Тільки адмін може видаляти синхронізовані мітки з сервера!");
                return; // Не оновлюємо карту, щоб мітка не зникла "просто так"
            }
        }
    }

    // Оновлюємо візуал
    const activePopups = document.getElementsByClassName('mapboxgl-popup');
    if (activePopups[0]) activePopups[0].remove();

    const urlParams = new URLSearchParams(window.location.search);
    const townSlug = urlParams.get('town') || 'berezhnytsia';
    await renderAllLocalMarkers(townSlug);
};

// --- 5. АДМІН-ФУНКЦІЇ ТА СИНХРОНІЗАЦІЯ ---
window.loginAdmin = async function() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert("Помилка: " + error.message);
    else {
        document.getElementById('admin-panel').style.display = 'none';
        checkAuthStatus();
    }
};

window.logoutAdmin = async function() {
    await supabaseClient.auth.signOut();
    location.reload();
};

async function checkAuthStatus() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const loginBtn = document.getElementById('show-login-btn');
    if (session) {
        loginBtn.innerText = "🔓";
        loginBtn.onclick = () => confirm("Вийти?") && logoutAdmin();
    } else {
        loginBtn.innerText = "🔑";
        loginBtn.onclick = () => {
            const panel = document.getElementById('admin-panel');
            panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
        };
    }
}
checkAuthStatus();

window.syncOfflineData = async function() {
    if (!navigator.onLine) return;
    const unsynced = await db.markers.where('is_synced').equals(0).toArray();
    for (let marker of unsynced) {
        const { data, error } = await supabaseClient
            .from('markers')
            .upsert({
                lng: marker.lng,
                lat: marker.lat,
                type: marker.type,
                comment: marker.comment,
                town_slug: marker.town_slug
            })
            .select();

        if (!error && data[0]) {
            await db.markers.update(marker.id, {
                is_synced: 1,
                remote_id: data[0].id
            });
        }
    }
};

window.addEventListener('online', window.syncOfflineData);
setInterval(window.syncOfflineData, 120000);