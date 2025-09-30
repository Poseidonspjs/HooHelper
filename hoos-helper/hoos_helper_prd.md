# Project Requirements Document (PRD) – Hoo’s Helper (MVP)

## 1. Overview
Hoo’s Helper is a chatbot platform designed to help UVA students plan their **four-year academic journey**. The MVP will implement a **Retrieval-Augmented Generation (RAG)** architecture so the chatbot can provide accurate, personalized, and course-specific guidance. Users will interact with the system through a mostly dropdown-based interface with limited free-text input for additional details.

---

## 2. Goals
- Deliver a chatbot MVP that can provide **knowledgeable, context-aware responses** about UVA courses and degree planning.
- Implement a **RAG architecture**: combine LLM capabilities with a course dataset for accurate retrieval.
- Enable users to input their intended major, focus area, and preferences, then generate a **custom four-year academic plan**.
- Keep user interface simple: dropdowns for structured inputs and a text field for optional extra details.
- Build with scalability in mind: future integrations for real-time advising, external datasets, and personalization.

---

## 3. Tech Stack
- **Frontend**: Next.js (React, TypeScript, TailwindCSS)
- **Backend**: Node.js (Express or Next.js API routes for MVP)
- **Database**: SQLite (course data + user profiles; later Postgres)
- **Vector Store**: Pinecone or open-source alternative (e.g., Weaviate, pgvector) for course embeddings
- **LLM Integration**: OpenAI API (for RAG pipeline)
- **Deployment**: Vercel (frontend + API), Docker optional for backend scaling
- **Keys/Secrets**: Managed via `.env.local` (see below). All values will be **manually provided by the developer**.

---

## 4. Environment Variables
A `.env.local` file **already exists** and is structured like this:

```bash
GROQ_API_KEY=your_groq_api_key_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_key

# Vercel KV (if using local dev, optional)
KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

Claude (or any other AI assistant) should assume this file is present and correctly structured. **No actual keys are committed to code.**

---

## 5. MVP Features

### 5.1 User Input
- **Dropdowns**:
  - Intended Major
  - Focus Area / Concentration
  - Entry Year
  - Any Advanced Placement (AP/IB) credits
- **Free-text field**: Additional details or preferences (e.g., “I want to study abroad in year 3”).

### 5.2 Chatbot Interaction
- Users input their academic details → chatbot generates a recommended **4-year plan**.
- Plan includes: list of courses per semester, prerequisites considered, electives chosen where applicable.
- Responses cite sources from UVA course catalog (via RAG).

### 5.3 Knowledge Base
- Seed dataset: UVA undergraduate course catalog (scraped or imported)
- Indexed with embeddings in a vector database
- Retriever pulls top-k relevant courses and program requirements into context for chatbot responses

### 5.4 API Endpoints (MVP)
- `POST /api/chat` – User query → RAG pipeline → chatbot response
- `GET /api/majors` – Fetch available majors
- `GET /api/focus-areas?major=xyz` – Fetch focus areas for a major
- `GET /api/courses?major=xyz` – Fetch courses for a major

### 5.5 UI Pages
- `/` → Landing page (app introduction)
- `/plan` → Main chatbot interface with dropdown inputs and chat output
- `/about` → About the project

### 5.6 Data Ingestion & Normalization 

**Goal:** Collect authoritative UVA course, major, and degree requirement information, and normalize it into JSON files for use in Hoo’s Helper’s RAG pipeline.  

### Data Sources  
1. **Majors/Minors Overview**: [https://www.virginia.edu/majors-minors/](https://www.virginia.edu/majors-minors/)  
   - Provides all offered programs at UVA.  

2. **Academic Catalog**: [https://records.ureg.virginia.edu/content.php?catoid=58&navoid=4883](https://records.ureg.virginia.edu/content.php?catoid=58&navoid=4883)  
   - Provides detailed program requirements, degree structures, and course lists.  

3. **Lou’s List**: [https://louslist.org/](https://louslist.org/)  
   - Provides full course listings, with descriptions, credits, and prerequisites.  

### Requirements  
- Implement scrapers for each source. 
  - Create scrapers in the `/scrapers` directory as:
    - `/scrapers/courses_scraper.tsx`
    - `/scrapers/majors_scraper.tsx`
- Normalize the data into the schema defined in this PRD:  
  - **Course Schema** (id, title, description, credits, prereqs, semestersOffered, fulfills).  
  - **Major Schema** (major, degree, entryYear, requirements, focusAreas, apCredits).  
- Save results in the `/data` directory as:  
  - `/data/courses.json`  
  - `/data/majors.json`  

### Constraints  
- Do not store scraped data in Redis (Vercel KV). JSON files will be the source of truth for MVP.  
- Redis is reserved for **caching API/chatbot responses** only.  
- No external keys or secrets should be hardcoded. Any authentication details (if needed in the future) will be added manually via `.env.local`.  

### Deliverables  
- Working scrapers that can populate `courses.json` and `majors.json`.  
- Normalized datasets that follow the schema defined above.  
- An appended note in `History.md` describing scraper creation and data ingestion progress.  

---

## 6. Non-Goals (MVP)
- No authentication (optional for MVP)
- No full registrar integration
- No live advising features
- No support for graduate programs

---

## 7. Architecture & File Structure

```
root
├── frontend (Next.js app)
│   ├── app/
│   │   ├── page.tsx (Landing)
│   │   ├── plan/page.tsx (Chatbot UI)
│   │   └── about/page.tsx
│   ├── components/
│   │   ├── Dropdown.tsx
│   │   ├── ChatWindow.tsx
│   │   └── Layout.tsx
│   ├── lib/
│   ├── styles/
│   └── utils/
├── backend (API + RAG pipeline)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── chat.ts
│   │   │   └── metadata.ts (majors, focus areas, courses)
│   │   ├── rag/
│   │   │   ├── retriever.ts
│   │   │   ├── embeddings.ts
│   │   │   └── generator.ts
│   │   ├── models/
│   │   └── middleware/
│   └── prisma/schema.prisma (if using Prisma + SQLite)
└── package.json
```

---

## 8. Milestones

**Milestone 1 – Setup**
- Initialize Next.js + API routes
- Configure SQLite database with majors/focus areas
- Setup vector store (local or hosted)
- Confirm `.env.local` file is used for secrets management

**Milestone 2 – Knowledge Base**
- Import UVA course catalog into DB
- Generate embeddings for courses
- Connect retriever to vector DB

**Milestone 3 – Chatbot MVP**
- Implement `/api/chat` RAG pipeline
- Build chatbot UI with dropdown inputs
- Display generated 4-year plan

**Milestone 4 – Polish & Deploy**
- Add Tailwind styling
- Test chatbot responses
- Deploy MVP to Vercel

---

## 9. Future Considerations (Post-MVP)
- User authentication + saved plans
- Real-time academic advisor integration
- Dynamic schedule export (e.g., iCal or PDF)
- Multi-turn conversational memory
- Support for dual majors/minors
- Study abroad + internship planning modules

---

## 10. Success Criteria (MVP)
- User selects a major, focus area, and inputs details.
- Chatbot returns a coherent four-year plan referencing real UVA courses.
- Responses include retrieved course details (via RAG).
- MVP deployed and functional.

---

## 11. Development Proccess / Constraints
### Development History Tracking
- All changes made by Claude Code/Copilot must be recorded in a file called `History.md` at the root of the project.  
- For each change, Claude should:
  - Append a dated entry in `History.md`.
  - Summarize what was changed, why, and which files were affected.  
  - Reference the relevant section of `@PRD.md` if applicable.  
- This ensures Claude/Copilot can always refer to both `@PRD.md` and `@History.md` to understand project goals, current status, and what has already been completed.  
- If code changes are detected that do not match the last recorded entry in @History.md, Claude Code/Copilot should ask the user whether to add a new entry describing those changes.  
- This ensures any co-founder edits or manual updates are also captured in the project history.  

---

**End of MVP PRD**

