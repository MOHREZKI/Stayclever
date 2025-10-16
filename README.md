# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2c3b147f-53b4-4d5c-afb3-648a7a9696da

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2c3b147f-53b4-4d5c-afb3-648a7a9696da) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Menjalankan langsung di terminal Lovable

Jika Anda bekerja dari terminal bawaan Lovable (seperti pada sesi ini), Anda tetap bisa menjalankan aplikasi dan memeriksa UI
secara penuh:

1. Pastikan dependensi sudah terpasang dengan `npm install` (cukup sekali setelah workspace dibuat).
2. Jalankan server pengembangan dengan `npm run dev -- --host` agar Vite menerima koneksi dari pratinjau Lovable.
3. Setelah perintah berjalan, klik tombol "Preview" di Lovable dan pilih port yang ditampilkan oleh Vite (biasanya 5173) untuk
   membuka aplikasi di browser embedded.
4. Gunakan kombinasi `Ctrl+C` di terminal untuk menghentikan server saat selesai.

Untuk pengecekan otomatis, Anda juga bisa menjalankan `npm run lint` dan `npm run build` langsung dari terminal yang sama.

## Mengunduh proyek yang sudah diperbarui

Ada dua cara yang bisa Anda gunakan untuk membawa perubahan di workspace ini ke mesin lokal Anda:

### 1. Push ke repositori GitHub pribadi

1. Buat repositori kosong di GitHub.
2. Salin URL HTTPS/SSH repositori tersebut.
3. Dari terminal Lovable, tambahkan remote baru dan dorong cabang `work` yang berisi perubahan:

   ```sh
   git remote add origin <URL_REPOSITORI_GITHUB_ANDA>
   git push -u origin work
   ```

4. Setelah berhasil, clone repositori dari komputer Anda seperti biasa (`git clone <URL_REPOSITORI_GITHUB_ANDA>`).

### 2. Mengunduh arsip ZIP langsung dari workspace

Jika Anda tidak ingin menyiapkan remote Git, Anda bisa membuat arsip ZIP dari commit terbaru dan mengunduhnya lewat antarmuka Lovable:

1. Jalankan `git archive --format zip HEAD -o stayclever.zip` untuk membuat file ZIP dari isi proyek saat ini.
2. Gunakan panel "Files" di Lovable untuk mengunduh `stayclever.zip` ke komputer Anda.
3. Ekstrak file ZIP tersebut di mesin lokal dan lanjutkan pengembangan seperti biasa.

Kedua metode di atas memastikan semua perubahan yang sudah dilakukan di cabang `work` dapat Anda simpan dan gunakan di luar lingkungan Lovable.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2c3b147f-53b4-4d5c-afb3-648a7a9696da) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Supabase integration

The app now reads and writes data exclusively through Supabase. Configure the following environment variables before running `npm run dev`:

```
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
# Optional: only needed if you want owners to create/reset other accounts from the UI.
VITE_SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> ⚠️ Never expose the service-role key in a public build. For production, move owner-only actions (create/reset users) to a secure backend or Edge Function and remove the service key from the client.

Run the SQL in `supabase-schema.sql` (Supabase SQL Editor or migration) to create tables, policies, and views used by the UI. Be sure to create at least one owner profile via Supabase (or by running `auth.admin.createUser`) so the management pages have an account with elevated permissions.
