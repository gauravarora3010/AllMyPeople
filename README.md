# 🌳 AllMyPeople

> An interactive, mathematically-driven relationship graph and family tree builder. 

**AllMyPeople** is a modern web application designed to help you map, visualize, and analyze your personal networks. Whether you are building a complex multi-generational family tree or mapping out a professional network, AllMyPeople uses advanced radial layout algorithms and smart relationship inference to make network mapping intuitive, fast, and beautiful.

![Project Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-Bear-brown?style=flat-square)

---

## ✨ Key Features

* **🕸️ Interactive Graph Visualization:** Powered by WebGL and Sigma.js, easily handle hundreds of nodes with smooth panning, zooming, and drag-and-drop repositioning.
* **✨ Smart Connect (Triadic Closure):** A custom inference engine that analyzes your graph's logical connections and auto-suggests missing relationships (e.g., automatically suggesting a "Grandparent" relationship between A and C if A is B's parent and B is C's parent).
* **🎯 Organic Auto-Layout Engine:** A custom breadth-first radial algorithm that automatically organizes your graph into neat, concentric circles based on relationship proximity to a designated "Root Person."
* **🔀 Bulk Operations:** Skip the tedious data entry. Add multiple people at once, or use the **Group Connect** feature to instantly assign a relationship (like "Friend") to a dozen people in one click.
* **📸 Rich Profiles:** Upload profile pictures (auto-cropped with colored borders based on gender), add contact info, social media links, and custom notes.
* **🔒 Secure & Multi-Tenant:** Full user authentication and the ability to create, save, and switch between multiple independent graphs/trees.

---

## 🛠️ Tech Stack

### Frontend
* **React 18** (Vite)
* **TypeScript** for rock-solid type safety.
* **Tailwind CSS** for responsive, modern UI styling.
* **Zustand** for lightweight, global state management.
* **@react-sigma/core** (Sigma.js / Graphology) for high-performance WebGL graph rendering.

### Backend & Database
* **Supabase** (PostgreSQL) for relational data storage, Edge computing, and Auth.
* **Supabase Storage** for handling user profile image uploads.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v16 or higher) and `npm` installed. You will also need a [Supabase](https://supabase.com/) account and project.

### 1. Clone the repository
```bash
git clone [https://github.com/yourusername/allmypeople.git](https://github.com/yourusername/allmypeople.git)
cd allmypeople
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory. **Never commit this file to version control.** Add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STORAGE_BUCKET=your_bucket_name_for_profile_pictures
```

*(Note: You can copy the `.env.example` file if one exists: `cp .env.example .env`)*

### 4. Database Setup (Supabase)
You will need three primary tables in your Postgres database:
* `graphs` (id, owner_id, name, root_node_id, created_at)
* `nodes` (id, graph_id, full_name, sex, dob, location, profession, photo_url, contact_info JSONB, social_links JSONB, layout_x, layout_y)
* `edges` (id, graph_id, source, target, label, reverse_label, category)

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to see the app.

---

## 🧠 How the Graph Engines Work

### Auto Layout (Radial Breadth-First Search)
When you click **Auto Layout**, the app doesn't just guess where to put people. It executes a mathematical pathfinding algorithm:
1. It identifies the **Root Person**.
2. It assigns **Weights** to relationships (e.g., Immediate Family = 1, Extended = 2).
3. It calculates the shortest path from the Root to every other person.
4. It plots people into concentric circular "levels," adding mathematical noise (fuzziness) to angles and radius depth to give the graph a natural, organic, constellation-like appearance.

### Smart Connect (Triadic Closure)
The `SmartSuggestionsModal` maps out an internal, bi-directional dictionary of every known relationship. It then runs through a strict set of 9 logical rules to find missing links. For example:
* **Rule 1 (Spouse):** Co-parents of the same child are likely Spouses.
* **Rule 4 (Grandparent):** Your parent's parent is your Grandparent.
* **Rule 9 (Cousin):** Your parent's sibling's child is your Cousin.

---

## 📂 Project Structure

```text
src/
├── components/
│   ├── NetworkGraph.tsx       # Core WebGL canvas rendering
│   ├── Sidebar.tsx            # Tree navigation and Graph settings
│   ├── SmartSuggestionsModal  # Inference engine UI
│   ├── BulkConnectModal.tsx   # Tabbed UI for group/row connection
│   └── ...                    # Other UI modals (AddPerson, etc.)
├── utils/
│   └── imageUtils.ts          # Canvas generators for initials & borders
├── store.ts                   # Zustand global state
├── supabaseClient.ts          # Supabase initialization
├── App.tsx                    # Main app shell and floating action buttons
└── main.tsx                   # React entry point
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---
*Built with ❤️ and mathematics.*