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
        this.filters = {
            showOpen: false,
            showFree: false,
            showWheelchair: false
        };
        
        this.init();
        this.loadToilets();
    }
    
    init() {
        this.bindEvents();
    }
    
    bindEvents() {
        const addToiletBtn = document.getElementById('addToiletBtn');
        const myLocationBtn = document.getElementById('myLocationBtn');
        const clearDirectionsBtn = document.getElementById('clearDirectionsBtn');
        const modal = document.getElementById('addToiletModal');
        const closeBtn = document.querySelector('.close');
        const cancelBtn = document.getElementById('cancelBtn');
        const toiletForm = document.getElementById('toiletForm');
        
        addToiletBtn.addEventListener('click', () => this.toggleAddMode());
        myLocationBtn.addEventListener('click', () => this.goToCurrentLocation());
        clearDirectionsBtn.addEventListener('click', () => this.clearDirections());
        closeBtn.addEventListener('click', () => this.closeModal());
        cancelBtn.addEventListener('click', () => this.closeModal());
        toiletForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }
    
    initMap() {
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
        
        this.map.addListener('click', (e) => {
            if (this.addingToilet) {
                this.showAddToiletForm(e.latLng);
            }
        });
        
        this.getCurrentLocation();
        this.displayToilets();
        
        // 初期データがある場合は統計を更新
        if (window.updateStats) {
            window.updateStats();
        }
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
                    
                    new google.maps.Marker({
                        position: this.currentLocation,
                        map: this.map,
                        title: '現在地',
                        icon: {
                            url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="%232196F3" stroke="white" stroke-width="2"/></svg>',
                            scaledSize: new google.maps.Size(20, 20)
                        }
                    });
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
        if (this.pendingToiletMarker) {
            this.pendingToiletMarker.setMap(null);
        }
        
        this.pendingToiletMarker = new google.maps.Marker({
            position: latLng,
            map: this.map,
            title: '新しいトイレ',
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="%23FF9800" stroke="white" stroke-width="2"/><text x="15" y="20" text-anchor="middle" fill="white" font-size="16">🚻</text></svg>',
                scaledSize: new google.maps.Size(30, 30)
            }
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
        
        const formData = new FormData(e.target);
        const toilet = {
            id: Date.now().toString(),
            name: formData.get('toiletName') || document.getElementById('toiletName').value,
            type: document.getElementById('toiletType').value,
            notes: document.getElementById('toiletNotes').value,
            free: document.getElementById('toiletFree').checked,
            wheelchair: document.getElementById('toiletWheelchair').checked,
            lat: this.pendingLocation.lat(),
            lng: this.pendingLocation.lng(),
            addedAt: new Date().toISOString()
        };
        
        this.addToilet(toilet);
        this.closeModal();
    }
    
    addToilet(toilet) {
        this.toilets.push(toilet);
        this.saveToilets();
        this.createToiletMarker(toilet);
        
        // 統計を更新
        if (window.updateStats) {
            window.updateStats();
        }
    }
    
    createToiletMarker(toilet) {
        const typeIcons = {
            convenience: '🏪',
            park: '🌳',
            station: '🚉',
            restaurant: '🍽️',
            gas: '⛽',
            other: '🚻'
        };
        
        const icon = typeIcons[toilet.type] || '🚻';
        
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
            icon: {
                url: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="${color}" stroke="white" stroke-width="2"/><text x="15" y="20" text-anchor="middle" font-size="16">${icon}</text></svg>`,
                scaledSize: new google.maps.Size(30, 30)
            }
        });
        
        const infoWindow = new google.maps.InfoWindow({
            content: this.createInfoWindowContent(toilet)
        });
        
        marker.addListener('click', () => {
            infoWindow.open(this.map, marker);
        });
        
        marker.addListener('dblclick', () => {
            this.showDirections(toilet);
        });
        
        this.markers.push({ marker, toilet });
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
            <div style="max-width: 250px;">
                <h3 style="margin: 0 0 10px 0; color: #333;">${toilet.name}</h3>
                <p style="margin: 5px 0;"><strong>種類:</strong> ${typeNames[toilet.type]}</p>
                <p style="margin: 5px 0;"><strong>料金:</strong> ${toilet.free ? '無料' : '有料・不明'}</p>
                <p style="margin: 5px 0;"><strong>車椅子対応:</strong> ${toilet.wheelchair ? '♿ 対応' : '❌ 非対応'}</p>
                ${toilet.notes ? `<p style="margin: 5px 0;"><strong>備考:</strong> ${toilet.notes}</p>` : ''}
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                    <button onclick="toiletFinder.showDirections(${JSON.stringify(toilet).replace(/"/g, '&quot;')})" 
                            style="background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">
                        🗺️ 道順
                    </button>
                    <p style="margin: 5px 0; font-size: 0.8em; color: #666;">
                        ${toilet.isPreset ? 'プリセットデータ' : `追加日: ${new Date(toilet.addedAt).toLocaleDateString('ja-JP')}`}
                    </p>
                </div>
            </div>
        `;
    }
    
    displayToilets() {
        this.toilets.forEach(toilet => {
            this.createToiletMarker(toilet);
        });
    }
    
    saveToilets() {
        // プリセットデータは保存しない
        const userToilets = this.toilets.filter(t => !t.isPreset);
        localStorage.setItem('toiletFinderToilets', JSON.stringify(userToilets));
    }
    
    loadToilets() {
        // ローカルストレージから読み込み
        const saved = localStorage.getItem('toiletFinderToilets');
        if (saved) {
            this.toilets = JSON.parse(saved);
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
}

// グローバル関数として定義
let toiletFinder;

function initMap() {
    toiletFinder = new ToiletFinder();
    toiletFinder.initMap();
}

// window オブジェクトに設定（Google Maps APIから呼び出されるため）
window.initMap = initMap;
