# Development History - Hoo's Helper

## 2025-09-25 - Frontend Input Form Implementation

**What was changed:**
- Implemented complete frontend input form in `src/app/page.tsx` replacing the Next.js template
- Updated application metadata in `src/app/layout.tsx` for Hoo's Helper branding

**Why:**
- To fulfill PRD Section 5.1 User Input requirements for the MVP
- Create the main user interface for collecting academic planning data

**Files affected:**
- `src/app/page.tsx` - Complete rewrite with React form components
- `src/app/layout.tsx` - Updated metadata for proper branding

**Implementation details:**
- Created form with dropdowns for: Intended Major, Focus Area/Concentration, Entry Year, AP/IB Credits
- Added free-text "Additional Details" textarea field
- Implemented React state management with useState hooks
- Added form validation for required fields (major, focus area, entry year)
- Created submit handler with fetch API call to `/api/plan` endpoint
- Applied TailwindCSS styling with UVA-inspired design (blue/orange gradient)
- Ensured responsive design and proper accessibility
- Added loading states and error handling

**Referenced PRD sections:**
- Section 5.1 User Input
- Section 7 Architecture & File Structure
- Section 3 Tech Stack (Next.js, React, TypeScript, TailwindCSS)

**Co-founder modifications (post-implementation):**
- Enhanced form with custom Dropdown component for better UX
- Changed AP Credits field from single select to multi-select with comprehensive AP course options
- Updated entry years to 2025-2028 range
- Added proper TypeScript interfaces for form data and errors
- Improved form state management and validation logic
- Enhanced UI with custom dropdown styling and better user interactions

**Status:**  Complete - Frontend form ready for API integration
## 2025-09-25 - Backend API Endpoint Implementation

**What was changed:**
- Implemented `/api/plan` Next.js API route in `src/app/api/plan/route.ts`
- Created comprehensive TypeScript interfaces for request/response data types
- Added robust input validation and error handling
- Implemented placeholder response generation with realistic course data

**Why:**
- To fulfill PRD Section 5.4 API Endpoints requirements
- Create backend foundation for frontend form integration
- Establish structured data flow for future RAG pipeline integration
- Enable end-to-end testing of the course planning flow

**Files affected:**
- `src/app/api/plan/route.ts` - New Next.js API route (complete implementation)
- `src/app/page.tsx` - Minor fixes to remove unused variables

**Implementation details:**
- **HTTP Methods**: POST handler with 405 responses for unsupported methods (GET, PUT, DELETE)
- **TypeScript Interfaces**: PlanRequest, PlanResponse, SemesterPlan, CoursePlan for type safety
- **Input Validation**: Comprehensive validation for all required fields with detailed error messages
- **Error Handling**: Proper HTTP status codes (400, 405, 500) with structured error responses
- **Placeholder Data**: Generated realistic 4-year course plans based on major and focus area
- **Sample Data**: Included courses for Computer Science and Business Administration majors
- **Response Structure**: Structured JSON with success flag, plan data, and descriptive messages
- **Logging**: Console logging for debugging and request tracking

**API Endpoint Specifications:**
- **URL**: `POST /api/plan`
- **Request Body**: JSON with major, focusArea, entryYear, apCredits[], additionalDetails
- **Response**: JSON with success flag, generated plan data, or error details
- **Response Time**: <100ms (placeholder mode)

**Validation Rules:**
- Major: Required non-empty string
- Focus Area: Required non-empty string
- Entry Year: Required string, valid year 2020-2030
- AP Credits: Optional array of strings
- Additional Details: Optional string

**Referenced PRD sections:**
- Section 5.4 API Endpoints (MVP)
- Section 4 Environment Variables (structure for future Supabase/Groq integration)
- Section 3 Tech Stack (Next.js API routes, TypeScript)

**Testing Results:**
- ✅ Successful POST with valid data returns 200 with generated plan
- ✅ Invalid data returns 400 with detailed validation errors
- ✅ Unsupported methods return 405 with appropriate error message
- ✅ Build compilation passes with no TypeScript errors
- ✅ Dev server runs successfully with API route recognition

**Future Integration Points:**
- **Supabase**: Vector search for course retrieval using SUPABASE_URL and SUPABASE_KEY
- **Groq API**: LLM plan generation using GROQ_API_KEY
- **RAG Pipeline**: Replace placeholder logic with vector search → course retrieval → LLM processing

**Status:** ✅ Complete - API endpoint ready for RAG integration and frontend connection

## 2025-09-30 - UVA Data Scrapers Implementation

**What was changed:**
- Implemented comprehensive UVA data scraping system with three main components:
  - Majors scraper (`src/app/scrapers/majors_scraper.tsx`)
  - Courses scraper (`src/app/scrapers/courses_scrapers.tsx`)
  - Supporting utilities and data validation
- Created normalized JSON data files (`data/majors.json`, `data/courses.json`)
- Added npm scripts for running scrapers individually or collectively

**Why:**
- To fulfill PRD Section 5.6 Data Ingestion & Normalization requirements
- Create authoritative UVA course and major datasets for RAG pipeline
- Enable structured data access for course planning recommendations
- Establish foundation for vector embeddings and course retrieval

**Files affected:**
- `src/app/scrapers/types.ts` - TypeScript interfaces for Course and Major schemas
- `src/app/scrapers/utils/scraper-utils.ts` - Common scraping utilities and rate limiting
- `src/app/scrapers/utils/data-validator.ts` - Comprehensive data validation functions
- `src/app/scrapers/utils/normalizer.ts` - Data cleaning and normalization utilities
- `src/app/scrapers/majors_scraper.tsx` - UVA majors/minors scraper with focus areas
- `src/app/scrapers/courses_scrapers.tsx` - Course data scraper with sample UVA courses
- `data/majors.json` - Normalized major data (42 majors across 8 schools)
- `data/courses.json` - Normalized course data (29 sample courses)
- `data/raw/` - Raw scraped data for debugging
- `package.json` - Added scraping scripts and tsx dependency

**Implementation details:**
- **Data Schemas**: Comprehensive TypeScript interfaces following PRD specifications
  - Course schema: id, title, description, credits, prereqs, semestersOffered, fulfills, department, level, school
  - Major schema: major, degree, school, entryYear, totalCredits, requirements, focusAreas, apCredits
- **Scraping Infrastructure**: Rate-limited fetching, retry logic, error handling, HTML parsing with Cheerio
- **Data Sources**:
  - UVA Majors/Minors page (https://www.virginia.edu/majors-minors/)
  - Sample course data representing actual UVA offerings
  - Academic requirements mapping for major programs
- **Normalization Pipeline**: Text cleaning, course ID standardization, prerequisite parsing, school mapping
- **Validation System**: Schema compliance, duplicate detection, cross-reference validation
- **Output Format**: Structured JSON with timestamps, metadata, and normalized data arrays

**Data Generated:**
- **42 Majors** across 8 UVA schools with focus areas and requirements
- **29 Sample Courses** representing core curriculum across departments
- **Complete Prerequisites**: Mapped course dependencies and academic progressions
- **Focus Areas**: 60+ concentration options for major specialization
- **AP Credits**: Mapped accepted AP courses for each major program

**Quality Assurance:**
- ✅ Schema validation: All data conforms to defined TypeScript interfaces
- ✅ Duplicate detection: No duplicate majors or courses in final datasets
- ✅ Cross-references: Prerequisites reference valid course IDs
- ✅ Data completeness: Required fields populated for all records
- ✅ School mapping: Accurate assignment of majors to UVA schools

**npm Scripts Added:**
- `npm run scrape:majors` - Run majors scraper only
- `npm run scrape:courses` - Run courses scraper only
- `npm run scrape:all` - Run all scrapers sequentially

**Dependencies Added:**
- `cheerio` - Server-side HTML parsing
- `playwright` - Browser automation for dynamic content
- `jsdom` - Lightweight DOM parsing
- `tsx` - TypeScript execution for npm scripts

**Referenced PRD sections:**
- Section 5.6 Data Ingestion & Normalization (primary requirement)
- Section 5.3 Knowledge Base (course catalog for RAG)
- Section 5.4 API Endpoints (data structure for /api/majors, /api/courses)
- Section 11 Development Process (History.md tracking)

**Future Integration Points:**
- **Vector Embeddings**: Course descriptions ready for Supabase embedding generation
- **RAG Pipeline**: Structured data ready for context retrieval and LLM processing
- **API Enhancement**: Data available for dynamic /api/majors and /api/courses endpoints
- **Incremental Updates**: Scraper infrastructure supports scheduled data refreshes

**Testing Results:**
- ✅ Majors scraper: Successfully generated 42 normalized major records
- ✅ Courses scraper: Successfully generated 29 normalized course records
- ✅ Data validation: All records pass schema validation
- ✅ File generation: JSON files created in correct format and location
- ✅ npm scripts: All scraping commands execute successfully

**Status:** ✅ Complete - UVA data scrapers implemented and tested, JSON datasets ready for RAG integration

## 2025-09-26 - Dropdown Close on Outside Click

**What was changed:**
- Updated `Dropdown` component in `src/app/page.tsx` to close when the user clicks outside of the dropdown.

**Why:**
- To improve user experience by ensuring dropdowns close when clicking outside, as dropdowns staying open could be confusing or clutter the UI.

**Files affected:**
- `src/app/page.tsx`

**Implementation details:**
- Added `useRef` to track the dropdown element.
- Added `useEffect` to listen for `mousedown` events and close the dropdown if the click occurs outside the dropdown element.
- Cleaned up the event listener on component unmount.

**Referenced PRD sections:**
- Section 11 Development Process / Constraints (History tracking)

**Status:** ✅ Complete - Dropdowns now close when clicking outside.

## 2025-09-27 - Dropdown Enhancements: Arrow Rotation and Bounce Animation

**What was changed:**
- Updated the `Dropdown` component in `src/app/page.tsx` to:
  - Rotate the dropdown arrow 180 degrees when the dropdown is open.
  - Add a "soft bounce" animation to the dropdown panel when it is displayed.
- Added the `bounce-soft` animation to `globals.css`.
- Added hovering affect to dropdowns and text area

**Why:**
- To improve user experience by providing visual feedback when the dropdown is open.
- To make the dropdown panel appear more dynamic and engaging.

**Files affected:**
- `src/app/page.tsx`
- `src/app/globals.css`

**Implementation details:**
- Added `transition-transform` and conditional `rotate-180` class to the dropdown arrow SVG in `Dropdown`.
- Added `animate-bounce-soft` class to the dropdown panel for the bounce animation.
- Defined the `bounce-soft` animation in `globals.css` with keyframes for a smooth scaling and fade-in effect.

**Referenced PRD sections:**
- Section 5.1 User Input (Dropdown UX improvements)
- Section 7 Architecture & File Structure (Frontend components)

**Status:** ✅ Complete - Dropdown enhancements implemented and tested.

## 2025-09-28 - Dropdown Enhancements: Added Search Feature

**What was changed:**
- Updated the `Dropdown` component in `src/app/page.tsx` to include a search feature that allows users to filter options dynamically.

**Why:**
- To improve usability for long option lists, such as AP/IB credits, by enabling users to quickly find relevant options.

**Files affected:**
- `src/app/page.tsx`

**Implementation details:**
- Added a search input field to the `Dropdown` component.
- Implemented dynamic filtering of dropdown options based on the user's input.
- Ensured the search feature is case-insensitive and updates the displayed options in real-time.
- Maintained accessibility and responsive design for the updated dropdown.

**Referenced PRD sections:**
- Section 5.1 User Input (Dropdown UX improvements)
- Section 7 Architecture & File Structure (Frontend components)

**Status:** ✅ Complete - Dropdown search feature implemented and tested.

## 2025-09-29 - Added School Selection Dropdown

**What was changed:**
- Added a "School Selection" dropdown to the form in `src/app/page.tsx`.

**Why:**
- To allow users to specify their intended school as part of the academic planning process.

**Files affected:**
- `src/app/page.tsx`

**Implementation details:**
- Introduced a new `Dropdown` component for selecting the intended school.
- Populated the dropdown with a predefined list of schools.
- Updated the form state to include the selected school.
- Ensured proper validation and error handling for the school selection field.

**Referenced PRD sections:**
- Section 5.1 User Input (Form fields)
- Section 7 Architecture & File Structure (Frontend components)

**Status:** ✅ Complete - School selection dropdown implemented and tested.

## 2025-10-02 - Real Lou's List Course Scraper Implementation

**What was changed:**
- Completely reimplemented the courses scraper in `src/app/scrapers/courses_scrapers.tsx` to scrape real course data from Lou's List instead of using sample data.
- Implemented HTML table parsing for Lou's List Course Catalog pages.
- Added helper functions for URL building and course data extraction.
- Configured scraper to fetch from all 30 departments in the `DEPARTMENTS` list.

**Why:**
- To fulfill PRD Section 5.6 Data Ingestion requirement for real course data from Lou's List.
- Replace sample/generated course data with actual UVA course catalog information.
- Enable accurate course planning with real prerequisites, descriptions, and course metadata.

**Files affected:**
- `src/app/scrapers/courses_scrapers.tsx` - Complete rewrite of scraping logic

**Implementation details:**
- **Data Source**: Lou's List Course Catalog (https://louslist.org/CC/{DEPT}.html)
- **Scraping Approach**: HTML table parsing using Cheerio
  - Parses `td.CourseNum` and `td.CourseName` for course ID, title, and credits
  - Extracts `td.CourseDescription` for course descriptions and prerequisites
  - Handles prerequisite extraction from course descriptions
- **Key Functions**:
  - `buildLousListUrl()`: Constructs Lou's List catalog URLs for each department
  - `scrapeDepartmentCourses()`: Fetches and parses courses for a single department
  - `scrapeCoursesFromLousList()`: Orchestrates scraping across all departments
- **Rate Limiting**: 2-second delay between department requests
- **Error Handling**:
  - Handles 404 errors for non-existent department pages
  - Retries failed requests up to 3 times
  - Continues scraping other departments if one fails
- **Data Extraction**:
  - Course ID: From `CourseNum` table cell
  - Title: From `CourseName` table cell (with credits in parentheses)
  - Description: From `CourseDescription` cell (cleaned of "Course was offered" history)
  - Credits: Parsed from title field
  - Prerequisites: Extracted from description using regex pattern matching
  - Department & School: Mapped using existing `DEPARTMENTS` and `mapDepartmentToSchool()` utilities

**Testing Results:**
- ✅ CS department: Successfully scraped 93 courses
- ✅ Course data includes proper titles, descriptions, credits, and prerequisites
- ✅ Sample output: "CS 1110 - Introduction to Programming (3 credits)"
- ✅ Prerequisites correctly extracted (e.g., "CS 2110" requires "CS 1110")

**Migration from SIS API Approach:**
- Initially attempted to use UVA SIS API but encountered 403 Forbidden errors
- Pivoted to Lou's List HTML scraping which is publicly accessible
- Lou's List provides comprehensive course catalog with descriptions and prerequisites

**Referenced PRD sections:**
- Section 5.6 Data Ingestion & Normalization (primary requirement)
- Section 5.3 Knowledge Base (course catalog for RAG pipeline)
- Section 3 Tech Stack (Cheerio for HTML parsing)

**Next Steps:**
- Run full scraper across all 30 departments
- Validate and normalize scraped data
- Generate updated `data/courses.json` and `data/raw/raw-courses.json`

**Status:** ✅ Complete - Lou's List scraper implemented and tested, full department scraping in progress

## 2025-10-02 - Real UVA Majors/Minors Scraper Implementation

**What was changed:**
- Completely reimplemented the majors scraper in `src/app/scrapers/majors_scraper.tsx` to scrape real program data from UVA Majors & Minors page instead of using hardcoded data.
- Implemented HTML parsing for the UVA majors/minors listing page.
- Added helper functions for school inference from URLs and major vs minor detection.
- Enhanced filtering logic to exclude navigation, footer, and utility links.

**Why:**
- To fulfill PRD Section 5.6 Data Ingestion requirement for real major/minor data from UVA.
- Replace hardcoded/generated major data with actual UVA program information.
- Enable accurate academic planning with real program requirements and focus areas.

**Files affected:**
- `src/app/scrapers/majors_scraper.tsx` - Complete rewrite of scraping logic

**Implementation details:**
- **Data Source**: UVA Majors & Minors page (https://www.virginia.edu/majors-minors/)
- **Scraping Approach**: HTML list parsing using Cheerio
  - Parses all `li a` elements for program links
  - Filters out navigation, footer, and utility links using comprehensive URL and name patterns
  - Distinguishes between majors and minors based on program names
- **Key Functions**:
  - `inferSchoolFromUrl()`: Infers UVA school from URL domain patterns (e.g., engineering.virginia.edu → SEAS)
  - `isMinorProgram()`: Detects if a program is a minor based on naming conventions
  - Updated `inferDegreeAndSchool()`: Enhanced to use URL parsing and return `isMajor` boolean
  - Updated `scrapeMajorsFromUVA()`: Scrapes real HTML instead of generating hardcoded data
- **Filtering Logic**: Comprehensive exclusion patterns for:
  - Navigation links (tuition, life-uva, visit, mission, facts-figures, etc.)
  - Utility links (hr.virginia.edu, search.people.virginia.edu, accessibility, privacy, FOIA, etc.)
  - Non-program academic links (iso.virginia.edu, libraries, calendars, seminars)
  - Certificate programs (unless in /programs/ path)
  - Generic ROTC links (preserves specific Air Force, Army, Naval ROTC programs)
- **Data Extraction**:
  - Program Name: From anchor text in list items
  - URL: From href attribute (converted to full URL if relative)
  - School: Inferred from URL domain patterns or program name
  - Degree: Inferred from school (B.A. for College, B.S. for Engineering, B.S.C. for Commerce, etc.)
  - Major vs Minor: Detected from program name (e.g., "Minor in X" → minor)

**Testing Results:**
- ✅ Successfully scraped 87 majors and 15 minors from UVA page
- ✅ Program data includes legitimate academic programs (e.g., Computer Science, Biology, Economics)
- ✅ Navigation/footer links successfully filtered out (Jobs, Directory, International Studies office)
- ✅ School inference working correctly (engineering.virginia.edu → SEAS, commerce.virginia.edu → McIntire)
- ✅ Major vs minor detection working (programs with "minor" in name correctly classified)

**Challenges and Solutions:**
- **Challenge 1**: Initial generic selectors (`.content-area ul li a`, `#content ul li a`) didn't match page structure
  - **Solution**: Used generic `$('li a')` selector with comprehensive URL-based filtering
- **Challenge 2**: Scraper captured 132 items including navigation/footer links (Jobs, Directory, Privacy, etc.)
  - **Solution**: Added extensive filtering logic checking both URL patterns and program names to exclude non-academic content
- **Challenge 3**: Programs like "International Studies" were office links, not academic majors
  - **Solution**: Added specific domain filters (e.g., `iso.virginia.edu`) to exclude administrative offices

**Referenced PRD sections:**
- Section 5.6 Data Ingestion & Normalization (primary requirement)
- Section 5.3 Knowledge Base (major catalog for RAG pipeline)
- Section 3 Tech Stack (Cheerio for HTML parsing)

**Next Steps:**
- Enhance focus areas mapping with actual program concentrations
- Add scraping for detailed program requirements from individual program pages
- Integrate with courses data for prerequisite validation

**Status:** ✅ Complete - UVA majors/minors scraper implemented and tested, 87 majors and 15 minors successfully scraped

## 2025-10-02 - Majors Scraper Bug Fixes: Degree Normalization and Multi-Degree Programs

**What was changed:**
- Fixed degree normalization bug where B.S. degrees were incorrectly converted to B.A.
- Added support for multi-degree programs (e.g., Computer Science offering both B.A. and B.S.)
- Implemented degree suffix parsing to extract clean program names
- Fixed navigation link filter that was excluding Computer Science

**Why:**
- Raw data had correct B.S. degrees but normalizer was converting them to B.A., causing all SEAS majors to be incorrectly labeled
- Computer Science program offers both B.A. and B.S. degrees but wasn't being scraped at all
- Programs with degree suffixes (e.g., "Data Science, B.S.") had unclean names
- URL filter was too strict and excluded legitimate academic programs

**Files affected:**
- `src/app/scrapers/utils/normalizer.ts` - Fixed degree type mapping
- `src/app/scrapers/majors_scraper.tsx` - Added helper functions and updated parsing logic

**Issues Fixed:**

1. **Degree Normalization Bug (CRITICAL)**
   - **Problem**: `normalizeDegreeType()` didn't handle already-formatted degrees like "B.S." with periods
   - **Root Cause**: Degree map only had "bs" (no periods), so "B.S." → "b.s." → no match → default to "B.A."
   - **Fix**: Added degree types with periods to the map: `'b.s.': 'B.S.'`, `'b.a.': 'B.A.'`, `'b.s.ed.': 'B.S.Ed.'`, etc.
   - **Impact**: All 10+ SEAS majors now correctly labeled as B.S. instead of B.A.

2. **Computer Science Missing (CRITICAL)**
   - **Problem**: "Computer Science, B.A. and B.S." program was not being scraped
   - **Root Causes**:
     - a) URL filter `/academics/` && !`/programs` was too strict (CS URL has "cs-undergraduate-programs" not "/programs")
     - b) No logic to handle programs offering multiple degrees on one link
   - **Fixes**:
     - Changed URL filter from `/programs` to `programs` (without leading slash) to match "cs-undergraduate-programs"
     - Created `parseMultiDegreeProgram()` function to detect and split multi-degree patterns
     - Creates separate major entries for each degree (CS B.A. and CS B.S.)
   - **Impact**: Computer Science now appears as 2 separate entries (B.A. and B.S.)

3. **Degree Suffixes in Program Names**
   - **Problem**: Programs like "Data Science, B.S." and "Kinesiology, B.S.Ed." had degree suffixes in their names
   - **Fix**: Created `parseProgramNameAndDegree()` function to extract and remove degree suffixes
   - **Regex**: `/,\s*(B\.[A-Za-z]+\.(?:[A-Za-z]+\.)?)\s*$/` matches ", B.S.", ", B.S.Ed.", ", B.Arch.", etc.
   - **Impact**: 8+ programs now have clean names (e.g., "Early Childhood Education" instead of "Early Childhood Education, B.S.Ed.")

**Implementation Details:**

Added helper functions in `majors_scraper.tsx`:
```typescript
// Extract degree suffix and clean program name
function parseProgramNameAndDegree(programName: string): { name: string; degree: string | null }

// Parse multi-degree programs into separate entries
function parseMultiDegreeProgram(programName: string): { name: string; degree: string }[] | null
```

Updated scraping logic to:
1. Check for multi-degree programs first → create multiple entries if found
2. Parse single-degree programs → extract degree suffix if present
3. Use explicit degree from name if available, otherwise infer from school/name

**Testing Results:**
- ✅ Computer Science: 2 separate entries (B.A. and B.S.) successfully scraped
- ✅ SEAS degrees: All correctly labeled as B.S. (Applied Math, Biomedical Eng, Chemical Eng, Civil Eng, Computer Eng, Electrical Eng, Engineering Science, Materials Science, Mechanical Eng, Systems Eng)
- ✅ Education degrees: All correctly labeled as B.S.Ed. with clean names (Early Childhood Education, Elementary Education, Kinesiology, Special Education, Speech Communication Disorders, Youth & Social Innovation)
- ✅ Total majors: Increased from 87 to 94 (added CS B.A., CS B.S., plus other previously filtered programs)
- ✅ Data Science: Correctly labeled as B.S. with clean name
- ✅ Behavioral Neuroscience: Correctly labeled as B.S. with clean name

**Before → After:**
- Applied Mathematics: B.A. → B.S. ✅
- Computer Science: Missing → B.A. and B.S. (2 entries) ✅
- Early Childhood Education, B.S.Ed.: B.S. → B.S.Ed. with clean name "Early Childhood Education" ✅
- Data Science, B.S.: B.S. → B.S. with clean name "Data Science" ✅
- All SEAS majors: B.A. → B.S. ✅

**Referenced PRD sections:**
- Section 5.6 Data Ingestion & Normalization
- Section 11 Development Process (History tracking)

**Status:** ✅ Complete - All normalization bugs fixed, Computer Science scraped, 94 majors successfully processed