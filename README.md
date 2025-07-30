# 🚻 トイレファインダー

自転車での遠出時にトイレを見つけるためのWebアプリケーションです。ユーザー同士でトイレ情報を共有できます。

## 機能

- 📍 地図上でトイレ位置を表示
- ➕ 新しいトイレ情報を追加
- 🏪 トイレの種類別アイコン表示（コンビニ、公園、駅など）
- 💰 無料/有料の表示
- 📱 レスポンシブデザイン
- 💾 ローカルストレージでデータ保存

## 使用方法

1. **Google Maps APIキーの設定**
   - [Google Cloud Console](https://console.cloud.google.com/)でMaps JavaScript APIを有効化
   - APIキーを取得
   - `index.html`の`YOUR_API_KEY`部分を実際のAPIキーに置き換え

2. **アプリの起動**
   - Webサーバーでファイルを配信（例：Live Server、Python http.server等）
   - ブラウザでアクセス

3. **トイレの追加**
   - 「📍 トイレを追加」ボタンをクリック
   - 地図上の任意の場所をクリック
   - 情報を入力して保存

4. **現在地表示**
   - 「📍 現在地」ボタンで現在地に移動

## ファイル構成

```
toilet-finder/
├── index.html      # メインHTML
├── styles.css      # スタイルシート
├── app.js          # JavaScript機能
└── README.md       # このファイル
```

## 技術仕様

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **地図API**: Google Maps JavaScript API
- **データ保存**: localStorage
- **レスポンシブ**: モバイル対応

## ブラウザサポート

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 今後の拡張可能性

- 📊 利用者レビュー・評価機能
- 🔍 検索・フィルター機能
- 📤 データのエクスポート/インポート
- 🌐 オンラインデータベース連携
- 📍 GPSナビゲーション機能
