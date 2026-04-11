// 1. Конфігурація Supabase
const SUPABASE_URL = 'https://asfsvpwmyeuxsvjhstwy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FhsifNSIoMPstKBrhy2UPQ_tZmCgGSj';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Масив для зберігання активних маркерів на карті
window.currentStatusMarkers = [];

// --- 1. ФУНКЦІЯ ЗАВАНТАЖЕННЯ МАРКЕРІВ ---
window.loadUserMarkers = async function(townSlug) {
    const cleanSlug = townSlug.trim().toLowerCase();
    await renderAllLocalMarkers(cleanSlug);

    if (navigator.onLine) {
        try {
            const { data, error } = await supabaseClient
                .from('markers')
                .select('*')
                .eq('town_slug', cleanSlug);

            if (!error && data) {
                // Використовуємо транзакцію для безпеки
                await db.transaction('rw', db.markers, async () => {
                    // Видаляємо старі синхронізовані для цього міста
                    await db.markers.where('town_slug').equals(cleanSlug)
                                    .and(m => m.is_synced === 1).delete();
                    
                    // Готуємо масив для швидкого вставлення
                    const toAdd = data.map(m => ({
                        ...m,
                        is_synced: 1,
                        remote_id: m.id,
                        id: undefined // Дозволяємо Dexie створити новий локальний ID
                    }));
                    
                    await db.markers.bulkAdd(toAdd);
                });
                await renderAllLocalMarkers(cleanSlug);
            }
        } catch (e) {
            console.error("Помилка мережі або бази:", e);
        }
    }
};

// --- 2. ФУНКЦІЯ МАЛЮВАННЯ СМАЙЛА ---
function renderEmojiMarker(data) {
    // 1. Ініціалізація контейнера маркерів, якщо його ще немає
    if (!window.currentStatusMarkers) window.currentStatusMarkers = [];

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

    // 2. ФОРМУЄМО ID (Рядок): 
    // Пріоритет: remote_id > існуючий local-ID > новий local-ID
    let displayId;
    if (data.remote_id) {
        displayId = String(data.remote_id);
    } else {
        const idStr = String(data.id || '');
        displayId = idStr.startsWith('local-') ? idStr : 'local-' + data.id;
    }

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

    // 3. ПРИВ'ЯЗУЄМО ID ДО ОБ'ЄКТА МАРКЕРА
    // Це дозволить функції syncOfflineData знайти цей маркер за ключем 'local-XXX'
    // і замінити його на реальний ID після синхронізації.
    marker.myId = displayId;

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

// --- 4. ФУНКЦІЯ ВИДАЛЕННЯ (ОНОВЛЕНА) ---
window.deleteMarkerFromDB = async function(markerId) {
    if (!confirm("Видалити цю відмітку?")) return;

    // 1. Перевірка авторизації
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        alert("Ви не авторизовані для видалення!");
        return;
    }

    const markerIdStr = String(markerId);
    const isLocal = markerIdStr.startsWith('local-');
    const isOnline = navigator.onLine;

    try {
        if (isLocal) {
            // Видалення локального чернетки (ще не було в Supabase)
            const idToDel = parseInt(markerIdStr.replace('local-', ''));
            await db.markers.delete(idToDel);
            console.log("Локальну чернетку видалено.");
        } else {
            // Видалення синхронізованого маркера
            const remoteId = parseInt(markerIdStr);

            if (isOnline) {
                // ЯКЩО Є ІНТЕРНЕТ: Видаляємо з Supabase, потім з Dexie
                const { error } = await supabaseClient
                    .from('markers')
                    .delete()
                    .eq('id', remoteId);

                if (error) {
                    console.error("Помилка сервера:", error.message);
                    alert("Не вдалося видалити на сервері: " + error.message);
                    return;
                }
                
                // Видаляємо з локальної бази тільки після успіху на сервері
                await db.markers.where('remote_id').equals(remoteId).delete();
                console.log("Маркер видалено звідусіль (online).");
            } else {
                // ЯКЩО НЕМАЄ ІНТЕРНЕТУ: Забороняємо видаляти те, що вже в базі
                alert("Видалення синхронізованих даних можливе лише з інтернетом.");
                return;
            }
        }

        // 2. ОНОВЛЕННЯ ІНТЕРФЕЙСУ
        // Закриваємо відкритий попап
        const activePopups = document.getElementsByClassName('mapboxgl-popup');
        if (activePopups[0]) activePopups[0].remove();

        // Очищаємо всі поточні об'єкти маркерів з карти Mapbox
        if (window.currentStatusMarkers) {
            window.currentStatusMarkers.forEach(m => m.remove());
            window.currentStatusMarkers = [];
        }

        // Перемальовуємо все заново з бази Dexie
        const urlParams = new URLSearchParams(window.location.search);
        const townSlug = urlParams.get('town') || 'berezhnytsia';
        await renderAllLocalMarkers(townSlug);

    } catch (err) {
        console.error("Критична помилка при видаленні:", err);
    }
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
    try {
        // 1. Спроба виходу через API
        await supabaseClient.auth.signOut();
    } catch (e) {
        console.log("Supabase API logout failed, clearing local data manually");
    }

    // 2. Очищення локального сховища (де Supabase тримає токен)
    localStorage.removeItem('sb-asfsvpwmyeuxsvjhstwy-auth-token'); 
    // Замініть 'asfsvpwmyeuxsvjhstwy' на ваш Project ID, якщо він інший
    
    // 3. ПЕРЕЗАВАНТАЖЕННЯ сторінки на головну без параметрів
    const url = new URL(window.location.href);
    window.location.href = url.origin + url.pathname + (url.search || ""); 
    // або просто location.reload();
};

// Функція для входу через головний екран
window.handleOverlayLogin = async function() {
    const email = document.getElementById('overlay-email').value;
    const password = document.getElementById('overlay-password').value;
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        alert("Помилка входу: " + error.message);
    } else {
        // Якщо вхід успішний, прибираємо завісу і оновлюємо статус
        document.getElementById('auth-overlay').style.display = 'none';
        checkAuthStatus();
    }
};

async function checkAuthStatus() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const overlay = document.getElementById('auth-overlay');
    const loginBtn = document.getElementById('show-login-btn');

    if (session) {
        // Користувач В СИСТЕМІ
        if (overlay) overlay.style.display = 'none';
        
        if (loginBtn) {
            loginBtn.innerText = "🔓";
            loginBtn.style.background = "#e1ffef"; // Зелений відтінок для активної сесії
            loginBtn.onclick = window.logoutAdmin;
        }

        // Завантажуємо дані лише якщо ми всередині
        const urlParams = new URLSearchParams(window.location.search);
        const townSlug = urlParams.get('town') || 'berezhnytsia';
        renderAllLocalMarkers(townSlug);
    } else {
        // Користувач ВИЙШОВ або НЕ ВХОДИВ
        if (overlay) overlay.style.display = 'flex';
        
        if (loginBtn) {
            loginBtn.innerText = "🔑";
            loginBtn.style.background = "#fff";
            loginBtn.onclick = () => {
                if (overlay) overlay.style.display = 'flex';
            };
        }
    }
}

// Викликаємо перевірку одразу при старті скрипта
checkAuthStatus();

// --- ОНОВЛЕНА СИНХРОНІЗАЦІЯ ---
window.syncOfflineData = async function() {
    // 1. Перевірка інтернету
    if (!navigator.onLine) return;
    
    // 2. Отримуємо всі несинхронізовані маркери
    const unsynced = await db.markers.where('is_synced').equals(0).toArray();
    if (unsynced.length === 0) return;

    console.log(`Знайдено ${unsynced.length} маркерів для синхронізації...`);

    for (let marker of unsynced) {
        // Відправляємо дані в Supabase
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

        if (error) {
            console.error("Помилка синхронізації маркера:", error);
            continue;
        }

        if (data && data[0]) {
            const newRemoteId = data[0].id;
            const oldLocalId = marker.id;
            const localKey = String(oldLocalId).startsWith('local-') ? oldLocalId : `local-${oldLocalId}`;

            // 3. Оновлюємо запис у локальній базі Dexie
            await db.markers.update(oldLocalId, {
                is_synced: 1,
                remote_id: newRemoteId
            });

            // 4. ОНОВЛЮЄМО ОБ'ЄКТ НА КАРТІ
            if (window.currentStatusMarkers) {
                const mapMarker = window.currentStatusMarkers.find(m => m.myId === localKey);
                
                if (mapMarker) {
                    // Оновлюємо внутрішній ID об'єкта в масиві
                    mapMarker.myId = String(newRemoteId);
                    
                    const popup = mapMarker.getPopup();
                    if (popup) {
                        // Отримуємо поточний HTML через внутрішній контейнер Mapbox (_content)
                        // Якщо попап ще не рендерився, використовуємо встановлений контент
                        let currentHTML = popup._content ? popup._content.innerHTML : popup._options.html;

                        if (currentHTML) {
                            // Замінюємо старий локальний ID на новий віддалений ID у рядку onclick
                            const updatedContent = currentHTML.replace(
                                new RegExp(`'${localKey}'`, 'g'), 
                                `'${newRemoteId}'`
                            );
                            
                            // Перевстановлюємо HTML для попапа
                            popup.setHTML(updatedContent);
                        }
                    }
                }
            }

            // 5. Оновлюємо кнопки в DOM, якщо попап зараз відкритий (для миттєвого відгуку)
            const activeButtons = document.querySelectorAll(`button[onclick*="'${localKey}'"]`);
            activeButtons.forEach(btn => {
                btn.setAttribute('onclick', `window.deleteMarkerFromDB('${newRemoteId}')`);
                
                // Візуальна індикація синхронізації
                const parent = btn.closest('.mapboxgl-popup-content');
                if (parent) {
                    parent.style.borderTop = "3px solid #28a745";
                }
            });

            console.log(`✅ Синхронізовано: ${localKey} -> remote:${newRemoteId}`);
        }
    }
};

// --- НОВА ФУНКЦІЯ: ОНОВЛЕННЯ ПОПАПА БЕЗ ПЕРЕЗАВАНТАЖЕННЯ ---
function updateMarkerPopupId(localId, remoteId) {
    // Шукаємо відкриті попапи в DOM
    const popupButtons = document.querySelectorAll(`button[onclick*="local-${localId}"]`);
    popupButtons.forEach(btn => {
        btn.setAttribute('onclick', `window.deleteMarkerFromDB('${remoteId}')`);
    });

    // Оновлюємо дані в самому об'єкті маркера (якщо ви зберігаєте їх там)
    // Але надійніше просто перемалювати маркери цього міста, якщо попап закритий
}

window.addEventListener('online', window.syncOfflineData);
setInterval(window.syncOfflineData, 120000);

