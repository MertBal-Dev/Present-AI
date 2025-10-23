# 🤖 Present AI: Akıllı Sunum Asistanı

<p align="center">
  <img src="https://img.shields.io/badge/Project%20Status-Active-brightgreen" alt="Project Status: Active">
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License: MIT">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React 18">
  <img src="https://img.shields.io/badge/Node.js-Express-43853d?logo=node.js" alt="Node.js/Express">
  <img src="https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google" alt="Google Gemini AI">
</p>

<p align="center">
  Sadece bir konu başlığı girerek saniyeler içinde araştırılmış, yapılandırılmış ve görsel olarak zengin sunumlar oluşturan modern bir web uygulaması.
</p>

<p align="center">
  <img src="https://github.com/MertBal-Dev/Present-AI/blob/main/demo.gif?raw=true" alt="Present AI Demo GIF"/>
</p>

---

## 🚀 Canlı Demo

**Projeyi canlı olarak deneyimlemek için:** **[https://present-ai-suet.vercel.app/](https://present-ai-suet.vercel.app/)**

---

## ✨ Temel Özellikler

Proje, fikir aşamasından son kullanıcıya kadar profesyonel bir ürün deneyimi sunmayı hedefler.

* **🧠 Akıllı İçerik Üretimi:** Google Gemini AI API kullanarak girilen konuya özel, akademik kaynakçaya sahip, tutarlı ve mantıksal bir akışa sahip slayt içerikleri oluşturur.
* **🎨 Modern ve Dinamik Arayüz:** React 18, Tailwind CSS ve Framer Motion ile geliştirilmiş akıcı, modern ve tamamen duyarlı bir kullanıcı arayüzü.
* **✏️ Gelişmiş İnteraktif Editör:**
    * **Sürükle & Bırak:** Slaytları kolayca yeniden sıralayın (`dnd-kit` entegrasyonu).
    * **Tam Kontrol:** Slayt başlıklarını, paragrafları, madde listelerini ve konuşmacı notlarını anlık olarak düzenleyin.
    * **Dinamik Slayt Yönetimi:** Tek tıkla yeni slaytlar ekleyin veya mevcut olanları silin.
* **↔️ Geri Al / Yinele Fonksiyonu:** State yönetimi yeteneğini sergileyen, editördeki tüm değişiklikler için Geri Al (Undo) ve Yinele (Redo) desteği.
* **🖼️ Akıllı Görsel Seçimi:** Her slaytın içeriğiyle en alakalı, yüksek çözünürlüklü görselleri Google & Pexels API'leri üzerinden bulur ve sunuma ekler.
* **⬇️ Çoklu Format Desteği:**
    * **PowerPoint (.pptx):** Oluşturulan sunumları, tamamen düzenlenebilir metin kutuları ve görsellerle `.pptx` formatında indirin.
    * **PDF:** Sunumları evrensel `.pdf` formatında dışa aktarın.
* **💻 Sunum Modu:** Oluşturulan slaytları doğrudan tarayıcı üzerinden, tam ekran modunda sunun.
* **📚 Hazır Şablonlar:** Farklı konular için hazırlanmış başlangıç şablonları ile hızlı bir başlangıç yapın.

---

## 🛠️ Teknoloji Mimarisi

Bu proje, modern ve ölçeklenebilir teknolojiler kullanılarak "full-stack" bir yaklaşımla geliştirilmiştir.

| Alan      | Teknoloji / Kütüphane                                                                         | Amaç                                                                    |
| :-------- | :-------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| **Frontend** | `React 18`                                                                                    | Komponent bazlı, reaktif kullanıcı arayüzü geliştirme.                  |
|           | `Tailwind CSS`                                                                                | Hızlı ve modern tasarımlar için "utility-first" CSS framework'ü.        |
|           | `Framer Motion`                                                                               | Akıcı ve göze hitap eden animasyonlar oluşturma.                           |
|           | `dnd-kit`                                                                                     | Sürükle-bırak işlevselliği için modern ve erişilebilir bir kütüphane.      |
| **Backend** | `Node.js`                                                                                     | Sunucu tarafı mantığı için olay tabanlı JavaScript çalışma ortamı.        |
|           | `Express.js`                                                                                  | API endpoint'lerini oluşturmak ve yönetmek için minimalist web framework'ü. |
|           | `axios`                                                                                       | Sunucu tarafı HTTP istekleri için.                                      |
| **AI & API'ler** | `Google Gemini API`                                                                               | Metin tabanlı sunum içeriği, yapı ve anahtar kelime üretimi.              |
|           | `Pexels API` / `Google Custom Search API`                                                     | Slayt içeriklerine uygun, lisanslı ve yüksek kaliteli görseller bulma.      |
| **Kütüphaneler** | `pptxgenjs`                                                                                   | Sunumları dinamik olarak `.pptx` formatında oluşturma ve indirme.         |
|           | `pdf-lib`                                                                                     | Sunumları dinamik olarak `.pdf` formatında oluşturma ve indirme.          |

---

## 🚀 Projeyi Yerel Makinede Çalıştırma

Bu proje, hem `client` hem de `server` uygulamalarını tek bir komutla başlatacak şekilde yapılandırılmıştır.

### Gereksinimler
* Node.js (v18.x veya üstü)
* npm

### Kurulum ve Başlatma

1.  **Depoyu Klonlayın:**
    ```bash
    git clone [https://github.com/MertBal-Dev/Present-AI.git](https://github.com/MertBal-Dev/Present-AI.git)
    cd Present-AI
    ```

2.  **Tüm Bağımlılıkları Yükleyin:**
    Bu komut, hem ana proje (`concurrently`), hem `client`, hem de `server` için gerekli tüm paketleri yükleyecektir.
    ```bash
    npm run install:all
    ```

3.  **.env Dosyasını Ayarlayın:**
    `server` klasörünün içinde bir `.env.example` dosyası oluşturun (eğer yoksa) ve bunu `.env` olarak kopyalayıp gerekli API anahtarlarınızı girin.

4.  **Projeyi Başlatın:**
    Bu komut, hem backend (`localhost:5001`) hem de frontend (`localhost:3000`) sunucularını aynı anda, tek bir terminalde başlatacaktır.
    ```bash
    npm run dev
    ```
Artık uygulama tarayıcınızda çalışıyor!

---

## 🎯 Projenin Hedefleri ve Gelecek Geliştimeler

Bu proje sadece mevcut özellikleriyle sınırlı kalmayıp, aşağıdaki gibi potansiyel geliştirmelere de açıktır:

* [ ] **Kullanıcı Hesapları:** Sunumları kaydetmek ve daha sonra düzenlemek için kullanıcı girişi ve veritabanı entegrasyonu (Firebase/MongoDB).
* [ ] **Daha Fazla Tema ve Düzen:** Kullanıcıların seçebileceği daha fazla slayt düzeni ve tema seçeneği.
* [ ] **Canlı Tema Editörü:** Kullanıcıların kendi renk paletlerini ve fontlarını seçerek özel temalar oluşturabilmesi.
* [ ] **İşbirliği Özellikleri:** Birden fazla kullanıcının aynı sunum üzerinde aynı anda çalışabilmesi (WebSocket ile).
* [ ] **Gelişmiş Dışa Aktarma Seçenekleri:** Konuşmacı notlarını PDF'e ekleme, farklı en-boy oranlarında export etme.

---

## 👤 Geliştirici

**İsmail Mert Bal**

* **GitHub:** [@MertBal-Dev](https://github.com/MertBal-Dev)
* **LinkedIn:** [Mertbal-Dev](https://www.linkedin.com/in/mertbal-dev/)

Bu projenin geliştirilme sürecinde karşılaşılan zorluklar ve çözümler hakkında daha fazla bilgi edinmek veya potansiyel iş fırsatları hakkında görüşmek için benimle iletişime geçmekten çekinmeyin.

---

## 📜 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.
