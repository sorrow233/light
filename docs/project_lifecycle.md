# Project Lifecycle

The **Project Lifecycle** module (`PrimaryDevModule`) manages the end-to-end development journey of a project in Flow Studio. It is designed to guide creators from initial ideation through to a "Graduated" advanced state.

## Core Concepts

### 1. Production Pipeline (Active Projects)
Projects that are actively being engineered live in the **Production Pipeline**. These projects are in one of the 5 foundational development stages.

### 2. Advanced Development
Once a project graduates from the pipeline, it moves to **Advanced Development**. These are mature projects that have passed the "Ascension Ritual".

---

## Development Stages

The pipeline consists of 5 sequential stages. While they have default purposes, their names can be customized per project.

| Default Stage | Icon | Concept |
| :--- | :--- | :--- |
| **Stage 1** | Layers | Foundation & Structure |
| **Stage 2** | MonitorPlay | Interactive Logic |
| **Stage 3** | Container | Data & State |
| **Stage 4** | Sparkles | Polish & AI |
| **Stage 5** | Flag | Launch Prep |

### Customizing Stage Names
You can rename stages to better fit your project's specific terminology.
- **How to Rename:** Double-click on any stage name in the left sidebar navigation.
- **Save:** Press `Enter` or click away to save.
- **Scope:** Stage names are persisted locally to the specific project.

### Stage Completion
- **Mark Complete**: Double-click the colored dot (or stage icon) in the sidebar to mark a stage as complete.
- **Progression**: Completing a stage automatically advances the project's internal pointer to the next stage.
- **Visuals**: Completed stages turn Green/Emerald. The current active stage pulsates.

---

## The Ascension Ritual (Graduation)
To move from the 5-stage pipeline to **Advanced Development**, a project must undergo the **Ascension Ritual**.

**Trigger:**
This option appears only when you are viewing **Stage 5** and the project has completed all 5 stages. Click the **"Enter Ascension Ritual"** button.

** The Four Pillars:**
You must affirm four checks before graduating:
1.  **Audience:** Have I truly understood who I am building for?
2.  **Vow:** Does this solution honor the original Founder's Vow?
3.  **Tech:** Is the technical heart beating steadily?
4.  **Ready:** Am I ready to leave the nursery and face the real world?

Once graduated, the project moves to the "Advanced Development" section on the dashboard.

---

## Command Center & Imports

You can import pre-built commands (tasks) into your project to speed up development.

### Importing Commands
1.  Click the **"Import Command"** button in the header or task list.
2.  **Filter by Category:** Use the dot-ribbon at the top to filter by categories (e.g., UI, Backend, Database).
3.  **Search:** Use the search bar to find specific commands.

### Intelligent Recommendations
The import modal is context-aware. It highlights **"Recommended"** commands based on your project's **current stage**.
*   *Example: "Install Tailwind" might be recommended in Stage 1, while "SEO Optimization" is recommended in Stage 5.*

### Command Categories
- `LayoutGrid` (UI/Layout)
- `Monitor` (Frontend Logic)
- `Server` (Backend)
- `Database` (Data)
- `Container` (DevOps)
- `Beaker` (Testing/Experimental)

---

## Task Management

Each stage has its own isolated task list.
- **Add Task:** Type in the input field at the bottom and press Enter.
- **Categorize:** Select a category (General, Feature, Bug, etc.) before adding.
- **Command Integration:** Imported commands appear as special tasks with tags and improved styling.
