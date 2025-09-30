// TypeScript interfaces for UVA data scraping and normalization
// Based on PRD Section 5.6 schema requirements

export interface Course {
  id: string;           // e.g., "CS 1110"
  title: string;        // e.g., "Introduction to Programming"
  description: string;  // Full course description
  credits: number;      // Credit hours (1-4)
  prereqs: string[];    // Array of prerequisite course IDs
  semestersOffered: string[]; // ["Fall", "Spring", "Summer"]
  fulfills: string[];   // Gen ed requirements fulfilled
  department: string;   // Department code (e.g., "CS", "MATH")
  level: number;        // Course level (1000, 2000, etc.)
  school: string;       // School offering the course
}

export interface Major {
  major: string;        // e.g., "Computer Science"
  degree: string;       // e.g., "B.S.", "B.A."
  school: string;       // e.g., "School of Engineering and Applied Science"
  entryYear: number[];  // Available entry years [2025, 2026, 2027, 2028]
  totalCredits: number; // Required credits for graduation
  requirements: {
    core: string[];     // Required core courses
    electives: string[]; // Elective categories/courses
    capstone: string[]; // Capstone requirements
  };
  focusAreas: string[]; // Available concentrations
  apCredits: {
    accepted: string[]; // Accepted AP courses
    maxCredits: number; // Maximum AP credits allowed
  };
}

// Data container interfaces for JSON output
export interface CoursesData {
  lastUpdated: string;  // ISO timestamp
  semester: string;     // e.g., "Fall 2025"
  courses: Course[];
}

export interface MajorsData {
  lastUpdated: string;  // ISO timestamp
  majors: Major[];
}

// Raw scraping interfaces (before normalization)
export interface RawCourse {
  id?: string;
  title?: string;
  description?: string;
  credits?: string | number;
  prereqs?: string | string[];
  semestersOffered?: string | string[];
  fulfills?: string | string[];
  department?: string;
  level?: string | number;
  school?: string;
  sourceUrl?: string;
}

export interface RawMajor {
  name?: string;
  degree?: string;
  school?: string;
  requirements?: string | any;
  focusAreas?: string | string[];
  sourceUrl?: string;
  description?: string;
}

// Scraper configuration and utility types
export interface ScraperConfig {
  baseUrl: string;
  rateLimit: number;    // Delay between requests in ms
  retryAttempts: number;
  timeout: number;      // Request timeout in ms
}

export interface ScrapingResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  timestamp: string;
}

// UVA-specific data structures
export interface UVASchool {
  name: string;
  abbreviation: string;
  url: string;
  majors: string[];
}

export interface LousListCourse {
  mnemonic: string;     // Department code
  number: string;       // Course number
  section: string;      // Section number
  title: string;
  instructor: string;
  days: string;
  time: string;
  location: string;
  enrollment: {
    current: number;
    limit: number;
    waitlist: number;
  };
}

// Validation and normalization types
export type ValidationError = {
  field: string;
  message: string;
  value: any;
};

export type NormalizationConfig = {
  trimWhitespace: boolean;
  removeHtmlTags: boolean;
  standardizeCourseIds: boolean;
  validateCredits: boolean;
  parsePrerequisites: boolean;
};

// Export utility type for scraper functions
export type Scraper<T> = {
  name: string;
  scrape: () => Promise<ScrapingResult<T>>;
  config: ScraperConfig;
};