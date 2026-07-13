# 書庫 — Google Drive PDF書籍リーダー

Google Driveに保存したPDF化書籍を、Kindleのように読むためのWebアプリです。バックエンドサーバーは使わず、ブラウザだけで完結します（GitHub Pagesでホスティングし、Androidタブレットなど任意の端末のChromeから利用）。

## できること

- 本棚画面（表紙サムネイル、検索、最近読んだ順）
- 読書画面（スワイプ／タップでページめくり、ピンチズーム、目次、しおり、読書位置の自動保存）
- ライト／ダーク／セピアのテーマ、明るさ調整
- 一度開いた本はオフラインでも読める（IndexedDBにキャッシュ）
- PWA対応（ホーム画面に追加してアプリのように起動）

**注意**: スキャンされたPDF（画像ベース）のため、Kindleのような文字サイズ変更（リフロー）はできません。ピンチズームで代用してください。

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Google Cloud Console の設定（初回のみ・手動作業）

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成（または既存のものを選択）
2. 「APIとサービス」→「ライブラリ」→ **Google Drive API** を有効化
3. 「APIとサービス」→「OAuth同意画面」を設定
   - ユーザータイプ: 外部
   - スコープに `https://www.googleapis.com/auth/drive.readonly` を追加
   - 「テストユーザー」に自分のGoogleアカウントを追加（個人利用なら「公開」ステータスにする必要はありません）
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→ **OAuthクライアントID**
   - アプリケーションの種類: **ウェブ アプリケーション**
   - 承認済みのJavaScript生成元に以下を追加:
     - `http://localhost:5173` （ローカル開発用）
     - `https://<GitHubユーザー名>.github.io` （本番用。GitHub PagesのURLの**オリジンのみ**、パスは含めない）
   - リダイレクトURIの設定は不要です
5. 発行された「クライアントID」（`....apps.googleusercontent.com`）をコピー

### 3. クライアントIDの設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開き、`VITE_GOOGLE_CLIENT_ID` にコピーしたクライアントIDを設定してください。

### 4. ローカルで動作確認

```bash
npm run dev -- --host
```

同じWi-Fiに接続したタブレットのChromeから `http://<PCのIPアドレス>:5173` を開くと、実機で動作確認できます。

## GitHub Pagesへのデプロイ

1. GitHubにリポジトリを作成し、このプロジェクトをpush
2. リポジトリの Settings → Pages で **Source: GitHub Actions** を選択
3. リポジトリの Settings → Secrets and variables → Actions → **Variables** タブで `VITE_GOOGLE_CLIENT_ID` を設定（クライアントIDは公開情報のため Secrets ではなく Variables でOK）
4. [vite.config.ts](vite.config.ts) の `BASE_PATH` を実際のリポジトリ名に合わせて修正（例: リポジトリ名が `book-reader` なら `/book-reader/`）
5. `main` ブランチにpushすると自動でビルド・デプロイされます
6. デプロイ後のURL（`https://<ユーザー名>.github.io/<リポジトリ名>/`）をタブレットのChromeで開き、メニューから「ホーム画面に追加」するとアプリのように使えます

## 使い方

1. 初回起動時、「Googleでサインイン」でDriveへのアクセスを許可
2. 書籍PDFが入っているDrive上のフォルダを選択
3. 本棚に表紙一覧が表示されるので、読みたい本をタップ

### 読書画面の操作

| 操作 | 動作 |
|---|---|
| 左右スワイプ／画面端タップ | ページめくり |
| 画面中央タップ | ツールバーの表示／非表示 |
| ピンチ | ズーム |
| ダブルタップ | ズームのオン／オフ切り替え |
| 「目次」ボタン | 目次・しおり一覧を表示 |
| 🔖ボタン | 現在のページにしおりを付ける |

読んだページは自動的に記録され、次回開いたときに続きから読めます。
