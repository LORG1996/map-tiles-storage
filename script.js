// Ініціалізація офлайн-бази Dexie
const db = new Dexie("TerritoryOfflineDB");
db.version(1).stores({
    // id - локальний, remote_id - з supabase, is_synced (0/1)
    markers: '++id, lat, lng, type, comment, town_slug, is_synced, created_at, remote_id'
});

// Глобальна функція для відображення всіх локальних маркерів на карті
async function renderAllLocalMarkers(townSlug) {
    const localMarkers = await db.markers.where('town_slug').equals(townSlug).toArray();

    // Очищаємо поточні маркери з карти (через глобальний масив з supabase-logic)
    if (window.currentStatusMarkers) {
        window.currentStatusMarkers.forEach(m => m.remove());
        window.currentStatusMarkers = [];
    }

    localMarkers.forEach(marker => {
        // Використовуємо існуючу функцію малювання з supabase-logic
        if (typeof renderEmojiMarker === 'function') {
            renderEmojiMarker(marker);
        }
    });
}

// 1. Конфігурація та Токен
mapboxgl.accessToken = 'pk.eyJ1IjoibWFrYXNpbjEyMyIsImEiOiJja3U4Y2NwMDEyMWJxMm9vNmpnaTNpM2xpIn0.SS9Vn71SdafbTU_0M9zJEg';

const townConfig = {
    "antonivka": { "name": "Антонівка", "coords": [24.1833821, 49.2746375], "zoom": 15, "layerIds": ["obj-1", "obj-2"] },
    "berezhnytsia": { "name": "Бережниця", "coords": [24.1848, 49.3370], "zoom": 14, "layerIds": ["obj-3","obj-4","obj-5","obj-6"] },
    "buianiv": { "name": "Буянів", "coords": [24.2953425, 49.2042124], "zoom": 14, "layerIds": ["obj-7","obj-8"] },
    "volodymyrtsi": { "name": "Володимирці", "coords": [24.2523697, 49.2406386], "zoom": 14, "layerIds": ["obj-9","obj-10","obj-11"] },
    "volia-oblaznytska": { "name": "Воля-Облазницька", "coords": [24.1076327, 49.278463], "zoom": 14, "layerIds": ["obj-12"] },
    "hannivtsi": { "name": "Ганнівці", "coords": [24.0729395, 49.2925947], "zoom": 14, "layerIds": ["obj-13"] },
    "holeshiv": { "name": "Голешів", "coords": [24.2699064, 49.3064675], "zoom": 14.5, "layerIds": ["obj-14","obj-15","obj-16"] },
    "demivka": { "name": "Демівка", "coords": [24.138518, 49.1888904], "zoom": 16, "layerIds": ["obj-17"] },
    "dubravka": { "name": "Дубравка", "coords": [24.2502312, 49.2173468], "zoom": 14, "layerIds": ["obj-18","obj-19"] },
    "dunaievets": { "name": "Дунаєць", "coords": [24.1828478, 49.2957613], "zoom": 16, "layerIds": ["obj-20"] },
    "zhyrivske": { "name": "Жирівське", "coords": [24.1676127, 49.2788322], "zoom": 15, "layerIds": ["obj-21","obj-22"] },
    "zhuravkiv": { "name": "Журавків", "coords": [24.2302797, 49.3387815], "zoom": 15, "layerIds": ["obj-23","obj-24"] },
    "zhuravno": { "name": "Журавно", "coords": [24.2813173, 49.2608246], "zoom": 13, "layerIds": ["obj-25","obj-26","obj-27","obj-28","obj-29","obj-30","obj-31","obj-32","obj-33","obj-34","obj-35","obj-36","obj-37","obj-38","obj-39","obj-40","obj-41","obj-42","obj-43","obj-44","obj-45"] },
    "zabolotivtsi": { "name": "Заболотівці", "coords": [24.1707094, 49.3260801], "zoom": 14, "layerIds": ["obj-46","obj-47","obj-48"] },
    "zahrabivka": { "name": "Заграбівка", "coords": [24.2023645, 49.2216525], "zoom": 16, "layerIds": ["obj-49"] },
    "zahurshchyna": { "name": "Загурщина", "coords": [24.1687284, 49.3584154], "zoom": 15, "layerIds": ["obj-50"] },
    "zarichne": { "name": "Зарічне", "coords": [24.2033509, 49.212395], "zoom": 15, "layerIds": ["obj-51","obj-52","obj-53"] },
    "kornelivka": { "name": "Корнелівка", "coords": [24.0784566, 49.2598375], "zoom": 13, "layerIds": ["obj-54"] },
    "korchivka": { "name": "Корчівка", "coords": [24.1620546, 49.1851594], "zoom": 15, "layerIds": ["obj-55"] },
    "kotoryny": { "name": "Которини", "coords": [24.3989078, 49.2074143], "zoom": 14, "layerIds": ["obj-56","obj-57"] },
    "krekhiv": { "name": "Крехів", "coords": [24.1531081, 49.241018], "zoom": 15, "layerIds": ["obj-58"] },
    "lapshyn": { "name": "Лапшин", "coords": [24.2812936, 49.2860053], "zoom": 15, "layerIds": ["obj-59"] },
    "lyskiv": { "name": "Лисків", "coords": [24.2005031, 49.1902875], "zoom": 14, "layerIds": ["obj-60","obj-61"] },
    "livchytsi": { "name": "Лівчиці", "coords": [24.1281595, 49.3116577], "zoom": 14, "layerIds": ["obj-62","obj-63","obj-64","obj-65"] },
    "liubsha": { "name": "Любша", "coords": [24.2299008, 49.2827995], "zoom": 14, "layerIds": ["obj-66","obj-67"] },
    "liutynka": { "name": "Лютинка", "coords": [24.3010483, 49.2279747], "zoom": 15, "layerIds": ["obj-68"] },
    "mazurivka": { "name": "Мазурівка", "coords": [24.2183401, 49.2742614], "zoom": 14, "layerIds": ["obj-69","obj-70"] },
    "marynka": { "name": "Маринка", "coords": [24.2221051, 49.2471987], "zoom": 16, "layerIds": ["obj-71"] },
    "makhlynets": { "name": "Махлинець", "coords": [24.0875479, 49.2390593], "zoom": 14, "layerIds": ["obj-72"] },
    "melnych": { "name": "Мельнич", "coords": [24.2877069, 49.2321934], "zoom": 14, "layerIds": ["obj-73","obj-74"] },
    "mlyniska": { "name": "Млиниська", "coords": [24.2276084, 49.3143851], "zoom": 14, "layerIds": ["obj-75","obj-76","obj-77"] },
    "monastyrets": { "name": "Монастирець", "coords": [24.3339431, 49.2132893], "zoom": 14, "layerIds": ["obj-78","obj-79","obj-80","obj-81"] },
    "nove-selo": { "name": "Нове Село", "coords": [24.1047616, 49.2596723], "zoom": 14, "layerIds": ["obj-82","obj-83"] },
    "novoshyny": { "name": "Новошини", "coords": [24.3251212, 49.2765898], "zoom": 14, "layerIds": ["obj-84","obj-85"] },
    "oblaznytsia": { "name": "Облазниця", "coords": [24.1293149, 49.2703183], "zoom": 15, "layerIds": ["obj-86"] },
    "podorozhnie": { "name": "Подорожнє", "coords": [24.1990693, 49.2282714], "zoom": 14, "layerIds": ["obj-87"] },
    "protesy": { "name": "Протеси", "coords": [24.4108657, 49.1852302], "zoom": 14, "layerIds": ["obj-88","obj-89","obj-90"] },
    "romanivka": { "name": "Романівка", "coords": [24.2254925, 49.192347], "zoom": 15.5, "layerIds": ["obj-90"] },
    "ruda": { "name": "Руда", "coords": [24.0941054, 49.3055086], "zoom": 14, "layerIds": ["obj-91","obj-92","obj-93"] },
    "sydorivka": { "name": "Сидорівка", "coords": [24.1332832, 49.2289142], "zoom": 14.5, "layerIds": ["obj-94"] },
    "smohiv": { "name": "Смогів", "coords": [24.235491, 49.3039707], "zoom": 14.5, "layerIds": ["obj-95"] },
    "stare-selo": { "name": "Старе Село", "coords": [24.3560623, 49.225788], "zoom": 14, "layerIds": ["obj-96","obj-97","obj-98"] },
    "sulyatychi": { "name": "Сулятичі", "coords": [24.1284611, 49.2029635], "zoom": 14, "layerIds": ["obj-99","obj-100"] },
    "ternavka": { "name": "Тернавка", "coords": [24.262091, 49.1983993], "zoom": 14.5, "layerIds": ["obj-101"] },
    "chertizh": { "name": "Чертіж", "coords": [24.2467538, 49.1776526], "zoom": 13, "layerIds": ["obj-102","obj-103","obj-104","obj-105"] }
};

let layersConfig = [];
window.currentTownName = "вибрану територію";

const tilePath = (window.location.href.includes('localhost') || window.location.protocol === 'file:')
                 ? '/htdocs/assets/map-tiles/{z}/{y}/{x}.png'
                 : window.location.origin + '/htdocs/assets/map-tiles/{z}/{y}/{x}.png';

const map = new mapboxgl.Map({
    container: 'map',
    style: {
        "version": 8,
        "glyphs": 'assets/glyphs/{fontstack}/{range}.pbf',

        "sources": {
            "raster-tiles": {
                "type": "raster",
                "tiles": [tilePath],
                "tileSize": 256
            }
        },
        "layers": [
            // 1. Шар супутника (має бути найпершим)
            {
                "id": "simple-tiles",
                "type": "raster",
                "source": "raster-tiles",
                "minzoom": 0,
                "maxzoom": 22
            },
            // 2. Додай цей шар фону і зроби його прозорим
            {
                "id": "background",
                "type": "background",
                "paint": {
                    "background-color": "rgba(0,0,0,0)" // Повністю прозорий
                }
            }
        ]
    },
    center: [24.18486, 49.33702],
    zoom: 14.5
});

async function checkRealInternet() {
    if (!navigator.onLine) return false;

    try {
        // Пробуємо "стукнути" в Google або свій сервер з коротким таймаутом
        const response = await fetch('https://www.google.com/favicon.ico', {
            mode: 'no-cors',
            cache: 'no-store',
            signal: AbortSignal.timeout(3000) // Чекаємо не більше 3 секунд
        });
        return true;
    } catch (err) {
        return false;
    }
}

// Оновлюємо статус кожні 10 секунд
async function updateStatusWithPing() {
    const isActuallyOnline = await checkRealInternet();
    const indicator = document.getElementById('sync-indicator');
    const text = document.getElementById('sync-text');

    if (isActuallyOnline) {
        indicator.className = 'online';
        text.innerText = 'Онлайн';
        // Тут можна запускати фонову синхронізацію
        if (window.syncOfflineData) syncOfflineData();
    } else {
        indicator.className = 'offline';
        text.innerText = 'Офлайн (немає зв\'язку)';
    }
}

setInterval(updateStatusWithPing, 10000); // Перевіряти раз на 10 сек

// --- 1. ФУНКЦІЇ ПОШУКУ ---
async function initSearch() {
    const searchInput = document.getElementById('location-search');
    const resultsContainer = document.getElementById('search-results');
    
    if (!searchInput || !resultsContainer) return;

    try {
        const response = await fetch('data/locations.json');
        const locations = await response.json();

        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            resultsContainer.innerHTML = ''; 
            
            if (term.length === 0) {
                resultsContainer.style.display = 'none';
                return;
            }

            let filtered = [];
            const nameMatches = locations.filter(loc => 
                loc.name.toLowerCase().includes(term)
            );
            filtered = [...nameMatches];

            Object.entries(townConfig).forEach(([slug, data]) => {
                const isIdMatch = data.layerIds.some(id => {
                    const numericPart = id.replace('obj-', '');
                    return numericPart === term || id.toLowerCase() === term;
                });

                if (isIdMatch && !filtered.some(f => f.name === data.name)) {
                    filtered.push({
                        name: data.name,
                        coords: data.coords,
                        zoom: data.zoom,
                        matchedById: true
                    });
                }
            });

            if (filtered.length > 0) {
                resultsContainer.style.display = 'block';
                filtered.forEach(loc => {
                    const item = document.createElement('div');
                    item.className = 'search-item';
                    if (loc.matchedById) {
                        item.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${loc.name}</span>
                                <span style="font-size: 11px; background: #7b4c7c; color: white; padding: 2px 8px; border-radius: 10px;">
                                    територія №${term}
                                </span>
                            </div>`;
                    } else {
                        item.innerText = loc.name;
                    }
                    item.onclick = () => {
                        const entry = Object.entries(townConfig).find(([key, val]) => val.name === loc.name);
                        const slug = entry ? entry[0] : null;
                        map.flyTo({ center: loc.coords, zoom: loc.zoom || 15, essential: true });
                        if (slug) {
                            updateURL(slug, loc.name);
                            renderVillageLayers(slug);
                        }
                        searchInput.value = loc.name;
                        resultsContainer.style.display = 'none';
                        searchInput.blur(); 
                    };
                    resultsContainer.appendChild(item);
                });
            } else {
                resultsContainer.style.display = 'none';
            }
        });
    } catch (err) { 
        console.warn("Помилка ініціалізації пошуку:", err); 
    }
}

// --- 2. ВІДОБРАЖЕННЯ ТЕРИТОРІЙ ---
async function renderVillageLayers(townSlug) {
    const townData = townConfig[townSlug];
    if (!townData || !townData.layerIds) return;

    // Очищуємо карту ПЕРЕД завантаженням конфігу, щоб не було накладань
    clearMapObjects();

    const cacheBuster = "v=1.0.1";

    if (layersConfig.length === 0) {
        try {
            const response = await fetch(`data/layers-config.json?${cacheBuster}`);
            layersConfig = await response.json();
        } catch (error) {
            console.error("Помилка завантаження конфігурації:", error);
            return;
        }
    }

    const activeLayers = layersConfig.filter(l => townData.layerIds.includes(l.id));
    
    // Перевіряємо наявність шарів текстових міток для правильного порядку (z-index)
    const layers = map.getStyle().layers;
    const labelLayer = layers.find(l => l.type === 'symbol' && l.layout['text-field']);
    const labelLayerId = labelLayer ? labelLayer.id : undefined;

    activeLayers.forEach(layer => {
        const sourceId = `${layer.id}-source`;
        
        // Додаємо source лише якщо його немає
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { 
                'type': 'geojson', 
                'data': `${layer.file}?${cacheBuster}`,
                'tolerance': 0.5 // Оптимізація для складних полігонів
            });
        }

        // Шар заливки
        const fillId = `${layer.id}-fill`;
        if (!map.getLayer(fillId)) {
            map.addLayer({
                'id': fillId,
                'type': 'fill',
                'source': sourceId,
                'filter': ['==', ['geometry-type'], 'Polygon'],
                'paint': {
                    'fill-color': ['coalesce', ['get', 'fill-color'], '#cccccc'],
                    'fill-opacity': ['coalesce', ['get', 'opacity'], 0.4]
                }
            }, labelLayerId); // Вставляємо ПІД написи
        }

        // Шар контуру
        const lineId = `${layer.id}-line`;
        if (!map.getLayer(lineId)) {
            map.addLayer({
                'id': lineId,
                'type': 'line',
                'source': sourceId,
                'filter': ['==', ['geometry-type'], 'Polygon'],
                'paint': {
                    'line-color': ['coalesce', ['get', 'line-color'], '#ffffff'],
                    'line-width': 2
                }
            }, labelLayerId);
        }

        // Кружечок і номер (завжди зверху, тому без labelLayerId)
        map.addLayer({
            'id': `${layer.id}-circle`,
            'type': 'circle',
            'source': sourceId,
            'filter': ['==', ['geometry-type'], 'Point'],
            'paint': {
                'circle-radius': 11,
                'circle-color': '#ffffff',
                'circle-stroke-width': 1,
                'circle-stroke-color': '#7b4c7c'
            }
        });

        map.addLayer({
            'id': `${layer.id}-number`,
            'type': 'symbol',
            'source': sourceId,
            'filter': ['==', ['geometry-type'], 'Point'],
            'layout': {
                'text-field': ['to-string', ['get', 'label']],
                'text-font': ['Open Sans Bold'],
                'text-size': 10,
                'text-allow-overlap': true
            },
            'paint': { 'text-color': '#000000' }
        });
    });

    // Маркери Supabase
    if (typeof window.loadUserMarkers === 'function') {
        window.loadUserMarkers(townSlug);
    }
}





// --- 3. КЕРУВАННЯ САЙДБАРОМ ТА КНОПКАМИ ---
function toggleSidebar() {
    const sidebar = document.getElementById('towns-sidebar');
    const openBtn = document.getElementById('open-sidebar');
    if (!sidebar) return;
    const isCollapsed = sidebar.classList.toggle('collapsed');
    if (openBtn) {
        if (isCollapsed) openBtn.classList.remove('hidden');
        else openBtn.classList.add('hidden');
    }
    setTimeout(() => { map.resize(); }, 350);
}

function initTownsSidebar() {
    const listContainer = document.getElementById('towns-list');
    if (!listContainer) return;
    const sortedTowns = Object.entries(townConfig).sort((a, b) => a[1].name.localeCompare(b[1].name));
    sortedTowns.forEach(([slug, data]) => {
        const item = document.createElement('div');
        item.className = 'town-item';
        item.textContent = data.name;
        item.onclick = () => {
            map.flyTo({ center: data.coords, zoom: data.zoom, essential: true });
            updateURL(slug, data.name);
            renderVillageLayers(slug);
            document.getElementById('location-search').value = data.name;
            if (window.innerWidth < 768) toggleSidebar();
        };
        listContainer.appendChild(item);
    });
}

// --- 4. ДОПОМІЖНІ ФУНКЦІЇ ---
function clearMapObjects() {
    const style = map.getStyle();
    if (!style) return;

    // Спочатку видаляємо всі шари, що стосуються об'єктів
    style.layers.forEach(layer => {
        if (layer.id.includes('-fill') || layer.id.includes('-line') || layer.id.includes('-circle') || layer.id.includes('-number')) {
            if (map.getLayer(layer.id)) map.removeLayer(layer.id);
        }
    });

    // КРИТИЧНО: Видаляємо джерела, інакше нові не додадуться
    layersConfig.forEach(layer => {
        const sourceId = `${layer.id}-source`;
        if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
        }
    });
}

function updateURL(slug, name) {
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('town', slug);
    window.history.pushState({}, '', newUrl.href);
    window.currentTownName = name;
}

function checkUrlOnLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    const townSlug = urlParams.get('town') || 'berezhnytsia';
    if (townConfig[townSlug]) {
        const target = townConfig[townSlug];
        map.flyTo({ center: target.coords, zoom: target.zoom });
        renderVillageLayers(townSlug);
        document.getElementById('location-search').value = target.name;
        window.currentTownName = target.name;
    }
}

function setMapLanguage(map) {
    const layers = map.getStyle().layers;
    layers.forEach(layer => {
        if (layer.layout && layer.layout['text-field']) {
            map.setLayoutProperty(layer.id, 'text-field', [
                'coalesce',
                ['get', 'name_uk'], 
                ['get', 'name'], 
                ['get', 'name_en']
            ]);
        }
    });
}

// Закриття сайдбару при кліку на карту
map.on('click', () => {
    const sidebar = document.getElementById('towns-sidebar');
    // Перевіряємо, чи сайдбар зараз відкритий (не має класу collapsed)
    if (sidebar && !sidebar.classList.contains('collapsed')) {
        toggleSidebar();
    }
});

// --- ГОЛОВНА ПОДІЯ ЗАВАНТАЖЕННЯ ---
map.on('style.load', () => {
    setMapLanguage(map);

    const layers = map.getStyle().layers;
    const labelLayerId = layers.find(l => l.type === 'symbol' && l.layout['text-field'])?.id;

    
// Функція для виклику меню (винесена окремо, щоб не дублювати код)
// У файлі script.js онови функцію showStatusPopup:
function showStatusPopup(coords) {
    new mapboxgl.Popup({ closeButton: true, focusAfterOpen: true })
        .setLngLat(coords)
        .setHTML(`
            <div style="padding: 10px; text-align: center; min-width: 200px; font-family: sans-serif;">
                <p style="margin-bottom: 10px; font-weight: bold;">Встановити статус:</p>
                
                <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                    <button onclick="saveMarkerToDB(${coords.lng}, ${coords.lat}, 'stop')" 
                            style="font-size: 20px; background: #fff1f1; border: 1px solid #ff4d4d; border-radius: 8px; padding: 8px; flex: 1;">🛑</button>
                    
                    <button onclick="saveMarkerToDB(${coords.lng}, ${coords.lat}, 'away')" 
                            style="font-size: 20px; background: #f1f7ff; border: 1px solid #4dadff; border-radius: 8px; padding: 8px; flex: 1;">❌</button>
                    
                    <button onclick="document.getElementById('comment-section').style.display='block'" 
                            style="font-size: 20px; background: #f1fff1; border: 1px solid #4dff4d; border-radius: 8px; padding: 8px; flex: 1;">✅</button>
                </div>

                <div id="comment-section" style="display: none; border-top: 1px solid #eee; pt: 10px;">
                    <textarea id="marker-comment" placeholder="Додати коментар (необов'язково)..." 
                              style="width: 100%; border: 1px solid #ccc; border-radius: 4px; padding: 5px; font-size: 12px; height: 50px; resize: none;"></textarea>
                    <button onclick="const msg = document.getElementById('marker-comment').value; saveMarkerToDB(${coords.lng}, ${coords.lat}, 'visit', msg)" 
                            style="margin-top: 8px; width: 100%; background: #28a745; color: white; border: none; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer;">
                        Підтвердити візит
                    </button>
                </div>
            </div>
        `)
        .addTo(map);
}

// 1. Для комп'ютерів (права кнопка)
map.on('contextmenu', (e) => {
    showStatusPopup(e.lngLat);
});

// 2. Для смартфонів (імітація довгого натискання)
let pressTimer;
map.on('touchstart', (e) => {
    // Якщо торкаємося двома пальцями (зум) — скасовуємо
    if (e.points.length > 1) {
        clearTimeout(pressTimer);
        return;
    }
    // Запускаємо таймер на 600 мс (стандарт для long press)
    pressTimer = setTimeout(() => {
        showStatusPopup(e.lngLat);
    }, 600);
});

map.on('touchend', () => clearTimeout(pressTimer));
map.on('touchmove', () => clearTimeout(pressTimer)); // Скасовуємо, якщо почали рухати карту

    // 2. Номери будинків
    if (!map.getLayer('house-numbers')) {
        map.addLayer({
            'id': 'house-numbers',
            'type': 'symbol',
            'source': 'composite',
            'source-layer': 'housenum-label',
            'minzoom': 17,
            'layout': {
                'text-field': ['coalesce', ['get', 'house_num'], ['get', 'housenumber']], 
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 17, 8, 20, 12],
                'text-allow-overlap': false
            },
            'paint': {
                'text-color': '#ffffff',
                'text-halo-color': 'rgba(0,0,0,0.9)',
                'text-halo-width': 2
            }
        });
    }

    // 3. ДОДАВАННЯ КНОПОК КЕРУВАННЯ (Навігація + GPS)
    // Кнопки масштабу
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Кнопка геолокації (GPS)
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
    }), 'top-right');

    // Ініціалізація інших систем
    initSearch(); 
    initTownsSidebar();
    checkUrlOnLoad();
});

// Обробники подій для кнопок інтерфейсу
document.getElementById('open-sidebar').onclick = toggleSidebar;
document.getElementById('close-sidebar').onclick = toggleSidebar;

document.getElementById('shareBtn').onclick = async () => {
    try {
        const data = { 
            title: "Території", 
            text: `н.п. ${window.currentTownName}`, 
            url: window.location.href 
        };
        if (navigator.share) await navigator.share(data);
        else { 
            await navigator.clipboard.writeText(window.location.href); 
            alert("Посилання скопійовано!"); 
        }
    } catch(e) { console.log("Share error:", e); }
};