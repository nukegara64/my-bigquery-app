# BigQuery Pulse - Release Notes Tracker

Google Cloud BigQuery の最新リリースノートを追跡し、見やすくカード形式で可視化して、気に入ったリリースを簡単に 𝕏 (旧Twitter) へポストできるWebアプリケーションです。

---

## 🌟 主な機能 (Features)

*   **リアルタイムフィード連携**: Google Cloud 公式の BigQuery リリースノート Atom フィードを取得します。
*   **個別カード化パース**: 日付ごとの複数のアプデ項目を `<h3>` タグで自動分割し、個別のカードとして可視化します。
*   **高速インメモリキャッシュ**: API の負荷軽減と高速化のため、データを5分間キャッシュします。
*   **更新（リフレッシュ）ボタン**: アニメーションスピナー付きボタンで、強制的に最新情報を再取得・キャッシュ更新できます。
*   **リアルタイム検索 & フィルタリング**:
    *   日付、アプデ内容、キーワードによるインクリメンタルな全文検索。
    *   カテゴリー（Feature / Change / Issue / Breaking / Announcement）ごとのチップフィルター。
*   **𝕏 (Twitter) 共有ドロワー**:
    *   カードをクリックするとスライドドロワーが開き、𝕏 用の投稿テキストを自動生成します。
    *   280文字制限に合わせて自動で文字数をカウントし、超過した場合は警告（ボタンの無効化）を行います。
    *   Web Intent 機能により、ログイン認証不要で安全にポスト画面を開きます。

---

## 🛠️ 技術スタック (Tech Stack)

*   **Backend**: Python 3, Flask, Requests (標準ライブラリ `xml.etree.ElementTree` によるXMLパース)
*   **Frontend**: Vanilla HTML5, CSS3 (CSS Variables, CSS Grid / Flexbox), Vanilla JavaScript (ES6)

---

## 📂 フォルダ構成 (Directory)

```text
my-bigquery-app/
├── app.py                  # Flask バックエンド & XMLパーサー
├── templates/
│   └── index.html          # メイン UI 構造 (HTML5)
├── static/
│   ├── css/
│   │   └── style.css       # テーマスタイル・アニメーション (CSS3)
│   └── js/
│       └── main.js         # クライアントステート・イベントハンドラー (JS)
├── .gitignore              # Git 無視リストの設定
└── README.md               # プロジェクト概要説明（本ファイル）
```

---

## 🚀 セットアップと実行方法 (Setup & Running)

### 1. リポジトリのクローン
```bash
git clone https://github.com/assassin20070521/my-bigquery-app.git
cd my-bigquery-app
```

### 2. 依存関係のインストール
必要なライブラリ (`Flask` および `requests`) をインストールします。
```bash
pip install Flask requests
```

### 3. アプリケーションの起動
```bash
python app.py
```

起動後、ブラウザで以下のアドレスを開くことでダッシュボードをご利用いただけます：
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📅 更新履歴 (Changelog)

### v1.1.0 (2026-06-16)
*   **ライト/ダークモード切り替え**: ヘッダーにトグルスイッチを追加し、ライトモードテーマに対応（設定は `localStorage` に保存）。
*   **コピー機能の追加**: リリースノートを綺麗に整形したプレーンテキストでクリップボードにコピーするボタンを追加（成功時にチェックマークへ変わるアニメーション付き）。
*   **CSVエクスポート**: 各カードから該当アップデートをCSV形式で直接ダウンロード可能に（Excelの文字化けを防ぐ UTF-8 BOM 付き）。

### v1.0.0 (2026-06-16)
*   初期リリース。
*   BigQueryリリースフィードの取得と `<h3>` 要素による自動分割・可視化機能。
*   API 側の 5分間キャッシュ機構と、スピナー付き「更新（リフレッシュ）」ボタン。
*   キーワードリアルタイム検索と、カテゴリー切り替え用チップフィルター。
*   𝕏 (Twitter) 共有用のサイド/ボトムスライドドロワーおよび文字数カウンター（280字制限制御）。

---

## 📝 ライセンス (License)

このプロジェクトは [MIT License](LICENSE) のもとで公開されています。
