// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyCSYSu-BS7zffRl0umu1YwXpW2znrBA7jM",
    authDomain: "toiletfinder-8bd3a.firebaseapp.com",
    databaseURL: "https://toiletfinder-8bd3a-default-rtdb.firebaseio.com",
    projectId: "toiletfinder-8bd3a",
    storageBucket: "toiletfinder-8bd3a.firebasestorage.app",
    messagingSenderId: "738709661269",
    appId: "1:738709661269:web:baaf76b8d2b357952b16dc"
};

// Firebase初期化
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    window.database = firebase.database();
    console.log('Firebase初期化完了');
    
    // 接続状態を監視
    database.ref('.info/connected').on('value', function(snapshot) {
        if (snapshot.val() === true) {
            console.log('Firebaseに接続されました');
        } else {
            console.log('Firebaseに接続されていません');
        }
    });
} else {
    console.error('Firebase SDKが読み込まれていません');
}

// 初期トイレデータ
window.INITIAL_TOILET_DATA = [
    {
        id: "tokyo-station-1",
        name: "東京駅 丸の内南口 公衆トイレ",
        type: "station",
        lat: 35.6797,
        lng: 139.7677,
        free: true,
        wheelchair: true,
        notes: "改札外、きれいで広い",
        isPreset: true
    },
    {
        id: "shibuya-hachiko",
        name: "渋谷駅 ハチ公口 公衆トイレ",
        type: "station",
        lat: 35.6590,
        lng: 139.7005,
        free: true,
        wheelchair: true,
        notes: "ハチ公像近く",
        isPreset: true
    },
    {
        id: "shinjuku-south",
        name: "新宿駅 南口 公衆トイレ",
        type: "station",
        lat: 35.6896,
        lng: 139.7006,
        free: true,
        wheelchair: true,
        notes: "駅構内",
        isPreset: true
    },
    {
        id: "asakusa-kaminari",
        name: "雷門前 公衆トイレ",
        type: "park",
        lat: 35.7105,
        lng: 139.7927,
        free: true,
        wheelchair: true,
        notes: "観光客多い、混雑注意",
        isPreset: true
    },
    {
        id: "ueno-park",
        name: "上野公園 噴水前トイレ",
        type: "park",
        lat: 35.7150,
        lng: 139.7730,
        free: true,
        wheelchair: true,
        notes: "きれいに改装済み",
        isPreset: true
    }
];

// CSVインポート関連の関数
window.parseCSV = function(csv) {
    // BOMを除去
    if (csv.charCodeAt(0) === 0xFEFF) {
        csv = csv.substr(1);
    }
    
    const lines = csv.split(/\r\n|\r|\n/).filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
        alert('CSVファイルにデータがありません');
        return;
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    document.getElementById('csvImportModal').style.display = 'block';
    
    const preview = document.getElementById('csvPreview');
    preview.innerHTML = `
        <h4>インポートプレビュー</h4>
        <p>検出された列: ${headers.join(', ')}</p>
        <p>データ行数: ${lines.length - 1}</p>
    `;
    
    document.getElementById('importBtn').style.display = 'block';
    document.getElementById('importBtn').onclick = function() {
        importToilets(lines, headers);
    };
};

window.importToilets = function(lines, headers) {
    let imported = 0;
    let failed = 0;
    
    const nameIndex = headers.findIndex(h => h === '名称' || h === 'name' || h === '施設名');
    const latIndex = headers.findIndex(h => h === '緯度' || h === 'lat' || h === 'latitude');
    const lngIndex = headers.findIndex(h => h === '経度' || h === 'lng' || h === 'longitude' || h === 'lon');
    
    if (nameIndex === -1 || latIndex === -1 || lngIndex === -1) {
        alert('必要な列（名称、緯度、経度）が見つかりません');
        return;
    }
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        const name = values[nameIndex] || '';
        const lat = parseFloat(values[latIndex] || '');
        const lng = parseFloat(values[lngIndex] || '');
        
        if (!name || isNaN(lat) || isNaN(lng)) {
            failed++;
            continue;
        }
        
        const toilet = {
            id: 'csv-' + Date.now() + '-' + i,
            name: name,
            lat: lat,
            lng: lng,
            type: 'other',
            free: true,
            wheelchair: false,
            isPreset: true,
            addedAt: new Date().toISOString()
        };
        
        if (window.toiletFinder) {
            toiletFinder.addToilet(toilet);
            imported++;
        }
    }
    
    alert(`${imported}件のトイレ情報をインポートしました！\n（${failed}件スキップ）`);
    closeCSVModal();
    updateStats();
};

window.closeCSVModal = function() {
    document.getElementById('csvImportModal').style.display = 'none';
    document.getElementById('csvFile').value = '';
};

window.updateStats = function() {
    if (window.toiletFinder) {
        const total = toiletFinder.toilets.length;
        const free = toiletFinder.toilets.filter(t => t.free).length;
        const wheelchair = toiletFinder.toilets.filter(t => t.wheelchair).length;
        
        document.getElementById('totalCount').textContent = total;
        document.getElementById('freeCount').textContent = free;
        document.getElementById('wheelchairCount').textContent = wheelchair;
    }
};

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', function() {
    // CSVファイル選択
    const csvFile = document.getElementById('csvFile');
    if (csvFile) {
        csvFile.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const csv = e.target.result;
                parseCSV(csv);
            };
            reader.readAsText(file, 'UTF-8');
        });
    }
    
    // CSVインポートボタン
    const importCSVBtn = document.getElementById('importCSVBtn');
    if (importCSVBtn) {
        importCSVBtn.addEventListener('click', function() {
            document.getElementById('csvFile').click();
        });
    }
    
    // 周辺のコンビニ検索ボタン
    const searchNearbyBtn = document.getElementById('searchNearbyBtn');
    if (searchNearbyBtn) {
        searchNearbyBtn.addEventListener('click', function() {
            if (!window.toiletFinder) {
                alert('地図の初期化中です。少々お待ちください。');
                return;
            }
            toiletFinder.searchNearbyStores();
        });
    }
    
    // 緊急ボタン
    const emergencyBtn = document.getElementById('emergencyBtn');
    if (emergencyBtn) {
        emergencyBtn.addEventListener('click', function() {
            if (window.toiletFinder) {
                toiletFinder.emergencyMode();
            }
        });
    }
    
    // フィルターボタン
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            if (window.toiletFinder) {
                toiletFinder.toggleFilter(filter);
            }
        });
    });
    
    // モーダルの閉じるボタン
    const closeButtons = document.querySelectorAll('.close, .close-modal');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // 初期化完了時に統計を更新
    setTimeout(() => {
        if (window.updateStats) {
            window.updateStats();
        }
    }, 1000);
});
