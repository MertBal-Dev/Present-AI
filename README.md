# 🤖 Present AI: Smart Presentation Assistant

<p align="center">
  <img src="https://img.shields.io/badge/Project%20Status-Active-brightgreen" alt="Project Status: Active">
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License: MIT">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React 18">
  <img src="https://img.shields.io/badge/Node.js-Express-43853d?logo=node.js" alt="Node.js/Express">
  <img src="https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google" alt="Google Gemini AI">
</p>

<p align="center">
  A modern web application that generates researched, structured, and visually rich presentations in seconds—just by entering a topic.
</p>

<p align="center">
  <img src="https://github.com/MertBal-Dev/Present-AI/blob/main/demo.gif?raw=true" alt="Present AI Demo GIF"/>
</p>

---
## 🇬🇧 English Description
Present AI is an AI-powered web application that enables users to automatically generate presentations enriched with text and images, just by entering a topic.
---
## 🇹🇷 Türkçe Açıklama
Present AI, kullanıcıların yalnızca bir konu başlığı girerek, otomatik olarak metin ve görsellerle zenginleştirilmiş sunumlar oluşturmasını sağlayan yapay zekâ destekli bir web uygulamasıdır.
---

## 🚀 Live Demo

**To experience the project live, visit:** **[https://present-ai-suet.vercel.app/](https://present-ai-suet.vercel.app/)**

---

## ✨ Key Features

This project aims to deliver a professional product experience from the idea stage to the end-user.

* **🧠 Intelligent Content Generation:** Uses the Google Gemini AI API to create slide content with a coherent logical flow and academic citations, specific to the entered topic.
* **🎨 Modern & Dynamic Interface:** A fluid, modern, and fully responsive user interface developed with React 18, Tailwind CSS, and Framer Motion.
* **✏️ Advanced Interactive Editor:**
    * **Drag & Drop:** Easily reorder slides with `dnd-kit` integration.
    * **Full Control:** Instantly edit slide titles, paragraphs, bullet points, and speaker notes.
    * **Dynamic Slide Management:** Add new slides or delete existing ones with a single click.
* **↔️ Undo/Redo Functionality:** Full support for Undo and Redo for all changes in the editor, showcasing state management capabilities.
* **🖼️ Smart Image Selection:** Finds and adds high-resolution images most relevant to each slide's content via Google & Pexels APIs.
* **⬇️ Multi-Format Export:**
    * **PowerPoint (.pptx):** Download presentations in `.pptx` format with fully editable text boxes and images.
    * **PDF:** Export presentations in the universal `.pdf` format.
* **💻 Presentation Mode:** Present your slides directly in the browser in full-screen mode.
* **📚 Pre-built Templates:** Get a quick start with ready-made templates for various topics.

---

## 🛠️ Tech Stack & Architecture

This project was developed with a full-stack approach using modern and scalable technologies.

| Area          | Technology / Library                    | Purpose                                                                 |
| :------------ | :-------------------------------------- | :---------------------------------------------------------------------- |
| **Frontend** | `React 18`                              | For building a component-based, reactive user interface.                |
|               | `Tailwind CSS`                          | A utility-first CSS framework for rapid and modern UI development.      |
|               | `Framer Motion`                         | For creating fluid and visually appealing animations.                   |
|               | `dnd-kit`                               | A modern, accessible library for drag-and-drop functionality.           |
| **Backend** | `Node.js`                               | An event-driven JavaScript runtime for server-side logic.               |
|               | `Express.js`                            | A minimalist web framework for building and managing API endpoints.       |
|               | `axios`                                 | For making promise-based HTTP requests from the server.                 |
| **AI & APIs** | `Google Gemini API`                     | For generating text-based presentation content, structure, and keywords.|
|               | `Pexels API` / `Google Custom Search API` | For finding licensed, high-quality images relevant to slide content.    |
| **Libraries** | `pptxgenjs`                             | For dynamically creating and downloading presentations in `.pptx` format. |
|               | `pdf-lib`                               | For dynamically creating and downloading presentations in `.pdf` format.  |

---

### 🧠 Core AI Pipeline
1. **Gemini 2.5 Pro** → generates structured presentation outlines
2. **Smart Image Search** → fetches visuals from Google, Wikimedia, Pexels
3. **Auto Slide Ranking** → ranks slides based on content richness
4. **Export Engine** → creates `.pptx` and `.pdf` files dynamically

---

## 🚀 Getting Started

This project is configured to launch both the `client` and `server` applications with a single command.

### Requirements
* Node.js (v18.x or higher)
* npm

### Installation and Setup

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/MertBal-Dev/Present-AI.git](https://github.com/MertBal-Dev/Present-AI.git)
    cd Present-AI
    ```

2.  **Install All Dependencies:**
    This command will install all necessary packages for the root project (`concurrently`), as well as for the `client` and `server` directories.
    ```bash
    npm run install:all
    ```

3.  **Set Up the .env File:**
    In the `server` directory, create a `.env` file by copying `.env.example` and fill in your required API keys.

4.  **Start the Project:**
    This command will start both the backend (`localhost:5001`) and frontend (`localhost:3000`) servers concurrently in a single terminal.
    ```bash
    npm run dev
    ```
The application is now running in your browser!

---

## 🎯 Project Roadmap & Future Enhancements

This project is not limited to its current features and is open to potential enhancements, such as:

* [ ] **User Accounts:** User login and database integration (Firebase/MongoDB) to save and edit presentations.
* [ ] **More Themes and Layouts:** A wider variety of slide layouts and theme options for users to choose from.
* [ ] **Live Theme Editor:** Allowing users to create custom themes by selecting their own color palettes and fonts.
* [ ] **Collaboration Features:** Enabling multiple users to work on the same presentation simultaneously (with WebSockets).
* [ ] **Advanced Export Options:** Adding speaker notes to PDFs, exporting in different aspect ratios.

---

## 👤 Developer

**İsmail Mert Bal**

* **GitHub:** [@MertBal-Dev](https://github.com/MertBal-Dev)
* **LinkedIn:** [Mertbal-Dev](https://www.linkedin.com/in/mertbal-dev/)

Feel free to contact me to learn more about the challenges and solutions encountered during this project's development or to discuss potential job opportunities.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
