class ToiletFinder {
    constructor() {
        this.map = null;
        this.toilets = [];
        this.currentLocation = null;
        this.addingToilet = false;
        this.pendingToiletMarker = null;
        this.directionsService = null;
        this.directionsRenderer = null;
        this.markers = [];
        this.infoWindows = []; // InfoWindowを管理
        this.filters = {
            showOpen: false,
            showFree: false,
            showWheelchair: false
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
    }
    
    bindEvents() {
        const addToiletBtn = document.getElementById('addToiletBtn');
        const myLocationBtn = document.getElementById('myLocationBtn');
        const clearDirectionsBtn = document.getElementById('clearDirectionsBtn');
        const modal = document.getElementById('addToiletModal');
        const closeBtns = modal.querySelectorAll('.close');
        const cancelBtn = document.getElementById('cancelBtn');
        const toiletForm = document.getElementById('toiletForm');
        
        if (addToiletBtn) {
            addToiletBtn.addEventListener('click', () => this.toggleAddMode());
        }
        if (myLocationBtn) {
            myLocationBtn.addEventListener('click', () => this.goToCurrentLocation());
        }
        if (clearDirectionsBtn) {
            clearDirectionsBtn.addEventListener('click', () => this.clearDirections());
        }
        
        // モーダルの閉じるボタン
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }
        if (toiletForm) {
            toiletForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        
        // モーダル外をクリックで閉じる
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }
    
    // 大きなトイレマークのSVGアイコンを生成
    createToiletIcon(color = '#2196F3', size = 40) {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="4"/>
                <text x="50" y="65" text-anchor="middle" font-size="40" fill="white">🚻</text>
            </svg>
        `;
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    }
    
    initMap() {
        console.log('地図初期化開始');
        const defaultCenter = { lat: 35.6762, lng: 139.6503 };
        
        this.map = new google.maps.Map(document.getElementById('map'), {
            zoom: 13,
            center: defaultCenter,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels.text',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });
        
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer({
            panel: document.getElementById('directionsText'),
            suppressMarkers: true
        });
        this.directionsRenderer.setMap(this.map);
        
        // 地図クリックイベント
        this.map.addListener('click', (e) => {
            if (this.addingToilet) {
                this.showAddToiletForm(e.latLng);
            }
        });
        
        // 初期データを読み込み
        this.loadToilets();
        
        // 現在地を取得
        this.getCurrentLocation();
        
        // トイレを表示
        this.displayToilets();
        
        // 統計を更新
        if (window.updateStats) {
            window.updateStats();
        }
        
        console.log('地図初期化完了');
    }
    
    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.map.setCenter(this.currentLocation);
                    
                    // 現在地マーカー（青い点）
                    new google.maps.Marker({
                        position: this.currentLocation,
                        map: this.map,
                        title: '現在地',
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: '#2196F3',
                            fillOpacity: 0.8,
                            strokeColor: 'white',
                            strokeWeight: 2
                        },
                        zIndex: 999
                    });
                    console.log('現在地取得成功:', this.currentLocation);
                },
                (error) => {
                    console.error('位置情報の取得に失敗しました:', error);
                    alert('位置情報の取得に失敗しました。ブラウザの設定を確認してください。');
                }
            );
        }
    }
    
    goToCurrentLocation() {
        if (this.currentLocation) {
            this.map.setCenter(this.currentLocation);
            this.map.setZoom(15);
        } else {
            this.getCurrentLocation();
        }
    }
    
    toggleAddMode() {
        this.addingToilet = !this.addingToilet;
        const btn = document.getElementById('addToiletBtn');
        
        if (this.addingToilet) {
            btn.textContent = '❌ キャンセル';
            btn.classList.add('btn-cancel');
            this.map.setOptions({ cursor: 'crosshair' });
            alert('地図上をクリックしてトイレの位置を指定してください');
        } else {
            btn.textContent = '📍 トイレを追加';
            btn.classList.remove('btn-cancel');
            this.map.setOptions({ cursor: 'default' });
            if (this.pendingToiletMarker) {
                this.pendingToiletMarker.setMap(null);
                this.pendingToiletMarker = null;
            }
        }
    }
    
    showAddToiletForm(latLng) {
        console.log('トイレ追加フォーム表示', latLng.lat(), latLng.lng());
        
        if (this.pendingToiletMarker) {
            this.pendingToiletMarker.setMap(null);
        }
        
        // 仮マーカーを表示
        this.pendingToiletMarker = new google.maps.Marker({
            position: latLng,
            map: this.map,
            title: '新しいトイレ',
            icon: this.createToiletIcon('#FF9800', 40),
            animation: google.maps.Animation.BOUNCE
        });
        
        this.pendingLocation = latLng;
        document.getElementById('addToiletModal').style.display = 'block';
    }
    
    closeModal() {
        document.getElementById('addToiletModal').style.display = 'none';
        document.getElementById('toiletForm').reset();
        
        if (this.pendingToiletMarker) {
            this.pendingToiletMarker.setMap(null);
            this.pendingToiletMarker = null;
        }
        
        if (this.addingToilet) {
            this.toggleAddMode();
        }
    }
    
    handleFormSubmit(e) {
        e.preventDefault();
        console.log('フォーム送信');
        
        const toilet = {
            id: Date.now().toString(),
            name: document.getElementById('toiletName').value,
            type: document.getElementById('toiletType').value,
            notes: document.getElementById('toiletNotes').value,
            free: document.getElementById('toiletFree').checked,
            wheelchair: document.getElementById('toiletWheelchair').checked,
            lat: this.pendingLocation.lat(),
            lng: this.pendingLocation.lng(),
            addedAt: new Date().toISOString()
        };
        
        console.log('追加するトイレ:', toilet);
        this.addToilet(toilet);
        this.closeModal();
    }
    
    addToilet(toilet) {
        this.toilets.push(toilet);
        this.saveToilets();
        const marker = this.createToiletMarker(toilet);
        
        // 統計を更新
        if (window.updateStats) {
            window.updateStats();
        }
        
        console.log('トイレ追加完了:', toilet);
        console.log('現在のトイレ数:', this.toilets.length);
    }
    
    createToiletMarker(toilet) {
        // 色分け
        let color;
        if (toilet.isPreset) {
            color = toilet.wheelchair ? '#1976D2' : '#2196F3';
        } else {
            color = toilet.free ? '#4CAF50' : '#FF9800';
            if (toilet.wheelchair) {
                color = '#9C27B0';
            }
        }
        
        const marker = new google.maps.Marker({
            position: { lat: toilet.lat, lng: toilet.lng },
            map: this.map,
            title: toilet.name,
            icon: this.createToiletIcon(color, 40)
        });
        
        const infoWindow = new google.maps.InfoWindow({
            content: this.createInfoWindowContent(toilet)
        });
        
        marker.addListener('click', () => {
            // 他のInfoWindowを閉じる
            this.infoWindows.forEach(iw => iw.close());
            infoWindow.open(this.map, marker);
        });
        
        marker.addListener('dblclick', () => {
            this.showDirections(toilet);
        });
        
        this.markers.push({ marker, toilet, infoWindow });
        this.infoWindows.push(infoWindow);
        return marker;
    }
    
    createInfoWindowContent(toilet) {
        const typeNames = {
            convenience: 'コンビニ',
            park: '公園',
            station: '駅',
            restaurant: 'レストラン・カフェ',
            gas: 'ガソリンスタンド',
            other: 'その他'
        };
        
        return `
            <div style="max-width: 300px;">
                <h3 style="margin: 0 0 10px 0; color: #333;">${toilet.name}</h3>
                <p style="margin: 5px 0;"><strong>種類:</strong> ${typeNames[toilet.type]}</p>
                <p style="margin: 5px 0;"><strong>料金:</strong> ${toilet.free ? '🆓 無料' : '💴 有料・不明'}</p>
                <p style="margin: 5px 0;"><strong>車椅子対応:</strong> ${toilet.wheelchair ? '♿ 対応' : '❌ 非対応'}</p>
                ${toilet.notes ? `<p style="margin: 5px 0;"><strong>備考:</strong> ${toilet.notes}</p>` : ''}
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                    <button onclick="toiletFinder.showDirectionsFromInfo('${toilet.id}')" 
                            style="background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">
                        🗺️ 道順
                    </button>
                    ${!toilet.isPreset ? `
                        <button onclick="if(confirm('このトイレ情報を削除しますか？')) { toiletFinder.deleteToilet('${toilet.id}'); }" 
                                style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                            🗑️ 削除
                        </button>
                    ` : ''}
                    <p style="margin: 5px 0; font-size: 0.8em; color: #666;">
                        ${toilet.isPreset ? 'プリセットデータ' : `追加日: ${new Date(toilet.addedAt).toLocaleDateString('ja-JP')}`}
                    </p>
                </div>
            </div>
        `;
    }
    
    // トイレを削除する関数
    deleteToilet(toiletId) {
        // トイレデータから削除
        const index = this.toilets.findIndex(t => t.id === toiletId);
        if (index !== -1) {
            this.toilets.splice(index, 1);
            this.saveToilets();
        }
        
        // マーカーを削除
        const markerIndex = this.markers.findIndex(m => m.toilet.id === toiletId);
        if (markerIndex !== -1) {
            const markerData = this.markers[markerIndex];
            markerData.marker.setMap(null);
            markerData.infoWindow.close();
            this.markers.splice(markerIndex, 1);
        }
        
        // 統計を更新
        if (window.updateStats) {
            window.updateStats();
        }
        
        console.log('トイレ削除完了:', toiletId);
    }
    
    // IDからトイレを検索して道順を表示
    showDirectionsFromInfo(toiletId) {
        const toilet = this.toilets.find(t => t.id === toiletId);
        if (toilet) {
            this.showDirections(toilet);
        }
    }
    
    displayToilets() {
        console.log('トイレ表示開始:', this.toilets.length + '件');
        this.toilets.forEach(toilet => {
            this.createToiletMarker(toilet);
        });
    }
    
    saveToilets() {
        // プリセットデータは保存しない
        const userToilets = this.toilets.filter(t => !t.isPreset);
        localStorage.setItem('toiletFinderToilets', JSON.stringify(userToilets));
        console.log('保存したトイレ数:', userToilets.length);
    }
    
    loadToilets() {
        // ローカルストレージから読み込み
        const saved = localStorage.getItem('toiletFinderToilets');
        if (saved) {
            try {
                const savedToilets = JSON.parse(saved);
                this.toilets = savedToilets;
                console.log('ローカルストレージから読み込み:', savedToilets.length + '件');
            } catch (e) {
                console.error('保存データの読み込みエラー:', e);
                this.toilets = [];
            }
        }
        
        // 初期データを追加（重複チェック）
        if (window.INITIAL_TOILET_DATA) {
            window.INITIAL_TOILET_DATA.forEach(initialToilet => {
                const exists = this.toilets.some(t => 
                    t.id === initialToilet.id || 
                    (Math.abs(t.lat - initialToilet.lat) < 0.0001 && 
                     Math.abs(t.lng - initialToilet.lng) < 0.0001)
                );
                
                if (!exists) {
                    this.toilets.push(initialToilet);
                }
            });
            console.log('初期データ追加後:', this.toilets.length + '件');
        }
    }
    
    showDirections(toilet) {
        if (!this.currentLocation) {
            alert('現在地が取得できていません。位置情報を有効にしてください。');
            return;
        }
        
        const request = {
            origin: this.currentLocation,
            destination: { lat: toilet.lat, lng: toilet.lng },
            travelMode: google.maps.TravelMode.BICYCLING
        };
        
        this.directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                this.directionsRenderer.setDirections(result);
                document.getElementById('directionsPanel').style.display = 'block';
                document.getElementById('clearDirectionsBtn').style.display = 'inline-block';
                
                const route = result.routes[0];
                const leg = route.legs[0];
                document.getElementById('directionsText').innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <strong>${toilet.name}までの道順</strong><br>
                        <small>距離: ${leg.distance.text} | 時間: ${leg.duration.text}</small>
                    </div>
                `;
            } else {
                alert('道順を取得できませんでした: ' + status);
            }
        });
    }
    
    clearDirections() {
        this.directionsRenderer.setDirections({routes: []});
        document.getElementById('directionsPanel').style.display = 'none';
        document.getElementById('clearDirectionsBtn').style.display = 'none';
    }
    
    // フィルター機能
    toggleFilter(filterName) {
        this.filters[filterName] = !this.filters[filterName];
        
        // ボタンのスタイルを更新
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            if (btn.textContent.includes('営業中') && filterName === 'showOpen') {
                btn.classList.toggle('active');
            } else if (btn.textContent.includes('無料') && filterName === 'showFree') {
                btn.classList.toggle('active');
            } else if (btn.textContent.includes('バリアフリー') && filterName === 'showWheelchair') {
                btn.classList.toggle('active');
            }
        });
        
        this.applyFilters();
    }
    
    applyFilters() {
        this.markers.forEach(({ marker, toilet }) => {
            let visible = true;
            
            if (this.filters.showFree && !toilet.free) {
                visible = false;
            }
            
            if (this.filters.showWheelchair && !toilet.wheelchair) {
                visible = false;
            }
            
            marker.setVisible(visible);
        });
    }
    
    // 緊急モード
    emergencyMode() {
        if (!this.currentLocation) {
            alert('現在地が取得できません！位置情報を有効にしてください。');
            return;
        }
        
        let nearestToilet = null;
        let minDistance = Infinity;
        
        this.toilets.forEach(toilet => {
            const distance = this.calculateDistance(
                this.currentLocation.lat, 
                this.currentLocation.lng,
                toilet.lat,
                toilet.lng
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestToilet = toilet;
            }
        });
        
        if (nearestToilet) {
            this.showDirections(nearestToilet);
            this.map.setZoom(17);
            this.map.setCenter({ lat: nearestToilet.lat, lng: nearestToilet.lng });
            
            // 緊急アラート表示
            const alert = document.createElement('div');
            alert.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #f44336;
                color: white;
                padding: 15px 25px;
                border-radius: 5px;
                font-weight: bold;
                z-index: 9999;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            `;
            alert.innerHTML = `
                🚨 最寄りトイレ: ${nearestToilet.name}<br>
                距離: ${(minDistance * 1000).toFixed(0)}m
            `;
            document.body.appendChild(alert);
            
            setTimeout(() => alert.remove(), 5000);
        }
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    // コンビニ検索機能
    searchNearbyStores() {
        console.log('コンビニ検索開始');
        
        if (!this.currentLocation) {
            alert('現在地を取得してください');
            return;
        }
        
        // Places APIが利用可能か確認
        if (!google.maps.places) {
            console.error('Places APIが読み込まれていません');
            alert('Places APIが利用できません。APIの設定を確認してください。');
            return;
        }
        
        const service = new google.maps.places.PlacesService(this.map);
        const request = {
            location: new google.maps.LatLng(this.currentLocation.lat, this.currentLocation.lng),
            radius: 1000, // 1km
            type: 'convenience_store',
            language: 'ja'
        };
        
        console.log('検索リクエスト:', request);
        
        service.nearbySearch(request, (results, status) => {
            console.log('検索結果:', status, results);
            
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                let added = 0;
                results.forEach(place => {
                    const toilet = {
                        id: 'places-' + place.place_id,
                        name: place.name,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        type: 'convenience',
                        free: true,
                        wheelchair: false,
                        isPreset: true,
                        notes: '営業時間は店舗により異なります'
                    };
                    
                    // 重複チェック
                    const exists = this.toilets.some(t => 
                        Math.abs(t.lat - toilet.lat) < 0.0001 && 
                        Math.abs(t.lng - toilet.lng) < 0.0001
                    );
                    
                    if (!exists) {
                        this.addToilet(toilet);
                        added++;
                    }
                });
                
                alert(`${added}件のコンビニを追加しました！`);
                updateStats();
            } else {
                console.error('Places search failed:', status);
                let errorMessage = '検索に失敗しました: ';
                
                switch(status) {
                    case google.maps.places.PlacesServiceStatus.ZERO_RESULTS:
                        errorMessage += '周辺にコンビニが見つかりませんでした';
                        break;
                    case google.maps.places.PlacesServiceStatus.ERROR:
                        errorMessage += 'サーバーエラーが発生しました';
                        break;
                    case google.maps.places.PlacesServiceStatus.INVALID_REQUEST:
                        errorMessage += '無効なリクエストです';
                        break;
                    case google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT:
                        errorMessage += 'APIの利用制限に達しました';
                        break;
                    case google.maps.places.PlacesServiceStatus.REQUEST_DENIED:
                        errorMessage += 'リクエストが拒否されました。APIキーを確認してください';
                        break;
                    default:
                        errorMessage += status;
                }
                
                alert(errorMessage);
            }
        });
    }
}

// グローバル関数として定義
let toiletFinder;

function initMap() {
    console.log('initMap関数が呼ばれました');
    toiletFinder = new ToiletFinder();
    toiletFinder.initMap();
    
    // グローバルに公開（デバッグ用）
    window.toiletFinder = toiletFinder;
}

// window オブジェクトに設定（Google Maps APIから呼び出されるため）
window.initMap = initMap;
