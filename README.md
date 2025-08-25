# Autonomous AI Organism

This project is a functional prototype of a sophisticated Autonomous AI Organism. It is a self-contained system with capabilities for learning, evolution, healing, collaboration, and even safe self-modification. Originally a placeholder-driven simulation, the core logic has been thoroughly implemented to create a dynamic and interactive AI ecosystem.

## Current Status

**Feature-Complete Prototype.** All major systems described below have been implemented with real, functional logic. The organism can perform complex tasks, learn from external sources, evolve its own capabilities, and manage its own ecosystem and memory. The application is now a fully functional, end-to-end prototype.

## Core Features & Functioning

This application is built on a set of interconnected, intelligent systems that allow the AI "organisms" to operate autonomously.

### 1. True Semantic Search & RAG
The organism's learning and knowledge retrieval are powered by a true semantic search implementation.
- **Vector-Based RAG:** The system uses a Retrieval-Augmented Generation (RAG) model built on a real vector store.
- **`hnswlib-node`:** The vector index is managed by `hnswlib-node`, a high-performance library for approximate nearest-neighbor search. The index is persisted to the file system in the organism's sandbox.
- **Sentence-Transformer Embeddings:** When new knowledge is acquired, it is converted into a 384-dimension vector embedding using a `sentence-transformers/all-minilm-l6-v2` model via the OpenRouter API.
- **Intelligent Retrieval:** When the organism queries its knowledge, the query is converted into an embedding and the vector store finds the most semantically similar pieces of information, ensuring retrieval is based on meaning, not just keywords.

### 2. High-Level Strategic Management
The organism is part of a larger ecosystem and can make high-level strategic decisions about its own memory and the ecosystem as a whole. These systems are no longer simulations; they execute real actions.
- **Ecosystem Evolution:** The `guideEcosystemEvolution` function can be called to trigger a system-wide evolution. It uses an LLM to generate a plan, identifies the fittest organisms, and then automatically calls the `evolve` API for those candidates.
- **Ecosystem Optimization:** The `optimizeEcosystem` function can trigger modifications across multiple organisms. It prompts an LLM for a structured plan, then parses that plan to execute actions like `create_capability` or `self_modify_code` for the specified organisms.
- **Resource Allocation:** The system can intelligently allocate resources (like CPU or memory priority) across the ecosystem. The `allocateResources` function uses an LLM to create a distribution plan and then updates a dedicated `resources` column in the `organisms` database table to apply it.
- **Data-Driven Memory Analysis:** The `analyzeMemoryPatterns` function first calculates concrete metrics about the organism's memory (size, key distribution, etc.) and then uses an LLM to generate insights based on that hard data, rather than a raw memory dump.

### 3. Autonomous Control & Computer Operations
The organism can interact with its host environment through a set of core computer operations.

- **Sandboxed Environment:** All operations are confined to a safe `organism_sandbox/` directory to prevent unintended system-level changes.
- **Implemented Operations:**
  - **`file_system`**: Read, write, create, and delete files and directories within the sandbox.
  - **`process`**: Execute arbitrary shell commands (like `git clone` or `ls`).
  - **`network`**: Make HTTP requests (`GET`, `POST`, etc.) to interact with external APIs and websites.
  - **`system_info`**: Retrieve real data about the host system's platform, CPU, and memory.
  - **`automation`**: Execute a script of other computer operations in sequence.
- **LLM-Based Safety Validation:** Before any operation is executed, it is first sent to an LLM acting as a meticulous "AI Safety and Ethics Guardian" to ensure the proposed action is safe and aligned with ethical principles.

### 4. Self-Modification (Code & Prompts)
This is one of the most advanced features of the system. The organism can upgrade its own source code and the prompts that define its behavior.

- **Safe Upgrade Cycle:** The process follows a strict safety protocol:
  1.  **Backup:** A timestamped backup of the target source file is created in the sandbox.
  2.  **Generate:** An LLM is prompted to rewrite the code or prompt with a specific improvement.
  3.  **Test:** The newly generated code is saved to a temporary file and tested using the TypeScript compiler (`tsc --noEmit`). This crucial "pre-flight check" ensures the new code is at least syntactically valid and does not break the program.
  4.  **Apply:** Only if the test passes is the original source file overwritten with the new code.
- **Supported Upgrades:** This system can perform `architecture`, `performance`, and `prompt` upgrades.

### 5. Dynamic Capability Creation
The organism is not limited to its initial set of functions.
- **`create_capability` Operation:** The organism can decide to create a new skill for itself.
- **LLM as a Code Generator:** It describes the desired function in natural language and uses an LLM to write the TypeScript code for that function.
- **Capability Memory:** The newly generated function's code is saved as a string to a dedicated `custom_capabilities` table in the database, effectively adding a new, self-invented tool to its memory.

### 6. Advanced Learning Systems
The organism can learn from a variety of external sources.
- **Internet Research:** Uses an LLM to perform research on any given topic, returning a structured summary of findings.
- **Codebase Analysis:** Can `git clone` any public repository into its sandbox, read key files, and use an LLM to generate a detailed analysis of the code's architecture, patterns, and technologies.

### 7. Generative Evolution & Healing
The organism's core lifecycle events are driven by dynamic, LLM-based logic.
- **Evolution:** Instead of using simple rules, the `evolve` function prompts an LLM to act as an "AI Evolution Strategist." It analyzes the organism's complete profile to generate novel, creative capabilities that address its weaknesses or enhance its strengths. The reasoning for each evolution is logged to the organism's memory.
- **Healing:** When an error occurs, the `heal` function prompts an LLM to act as an "AI Diagnostic and Repair System." It analyzes the error context, determines a root cause, and proposes a set of new capabilities the organism should develop to prevent such errors in the future.

### 8. Collaboration Engine
Organisms can work together to solve problems.
- **Hybrid Execution Model:** The collaboration system uses a turn-based loop to manage the flow of a task.
- **Parallel Processing:** Within each turn, all participating organisms "think" and perform their work in parallel (using `Promise.all`).
- **Database as Message Bus:** Organisms communicate by posting their findings for each turn to the database, allowing others to see the full context in the next turn.
- **Final Synthesis:** After all turns are complete, a final LLM call synthesizes the entire conversation log into a single, collective answer.

### 9. Real Memory Management
- **Algorithmic Compression:** The `performMemoryCompression` function uses real algorithms to compress the organism's memory. It supports `temporal` (removing the oldest memories) and `importance` (removing memories with the lowest confidence scores) strategies to stay within size limits.

## Getting Started

### Prerequisites
- Install the **Encore CLI**: `curl -L https://encore.dev/install.sh | bash`
- Install **bun**: `npm install -g bun`

### 1. Set API Keys
The application uses OpenRouter.ai to access various Large Language Models. You need to provide at least one API key.

Navigate to the `backend` directory and set the secret. You can add multiple keys separated by commas.
```bash
cd backend
encore secret set --type production OpenRouterAPIKeys --value your_openrouter_key_here
cd ..
```

### 2. Run the Application
You will need two terminals.

- **Terminal 1: Run the Backend**
  ```bash
  cd backend
  encore run
  ```
  The backend will be available at the URL shown in your terminal (typically `http://localhost:4000`).

- **Terminal 2: Run the Frontend**
  ```bash
  cd frontend
  bun install
  bun run dev
  ```
  The frontend will be available at `http://localhost:5173`.
