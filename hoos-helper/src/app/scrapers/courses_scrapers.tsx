// UVA Courses Scraper for Lou's List
// Scrapes course data from https://louslist.org/ and UVA Academic Catalog
// and normalizes it according to PRD schema requirements

import { RawCourse, ScrapingResult, ScraperConfig } from './types';
import {
  fetchWithRetry,
  parseHtml,
  cleanText,
  createSuccessResult,
  createErrorResult,
  logProgress,
  defaultScraperConfig,
  mapDepartmentToSchool,
  getCourseLevel,
  parsePrerequisites,
  standardizeCourseId
} from './utils/scraper-utils';
import { normalizeCourses, deduplicateCourses } from './utils/normalizer';
import { validateCourses } from './utils/data-validator';
import * as fs from 'fs';
import * as path from 'path';

const COURSES_CONFIG: ScraperConfig = {
  ...defaultScraperConfig,
  baseUrl: 'https://louslist.org/CC',
  rateLimit: 2000, // 2 second delay between requests (be respectful)
  retryAttempts: 3,
  timeout: 45000
};

// Department codes and their full names
const DEPARTMENTS = {
  'CS': 'Computer Science',
  'ECE': 'Electrical and Computer Engineering',
  'MAE': 'Mechanical and Aerospace Engineering',
  'CE': 'Civil Engineering',
  'BME': 'Biomedical Engineering',
  'CHE': 'Chemical Engineering',
  'MSE': 'Materials Science and Engineering',
  'STS': 'Science, Technology and Society',
  'APMA': 'Applied Mathematics',
  'COMM': 'Commerce',
  'MATH': 'Mathematics',
  'PHYS': 'Physics',
  'CHEM': 'Chemistry',
  'BIOL': 'Biology',
  'PSYC': 'Psychology',
  'ECON': 'Economics',
  'ENGL': 'English',
  'HIST': 'History',
  'POLI': 'Politics',
  'PHIL': 'Philosophy',
  'SPAN': 'Spanish',
  'FREN': 'French',
  'GERM': 'German',
  'NURS': 'Nursing',
  'ARCH': 'Architecture',
  'EDLF': 'Educational Leadership, Foundations and Policy',
  'KINE': 'Kinesiology',
  'PPOL': 'Public Policy',
  'DS': 'Data Science',
  'STAT': 'Statistics'
};

// Sample course data for testing (based on actual UVA courses)
const SAMPLE_COURSES: RawCourse[] = [
  // Computer Science
  {
    id: 'CS 1110',
    title: 'Introduction to Programming',
    description: 'A first course in programming, software development, and computer science. Introduces fundamental concepts in programming including abstraction, algorithms, design, and object-oriented programming. Assignments based on real-world problems.',
    credits: 3,
    prereqs: [],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: ['Quantitative Reasoning'],
    department: 'CS',
    level: 1000,
    school: 'School of Engineering and Applied Science'
  },
  {
    id: 'CS 2110',
    title: 'Software Development Methods',
    description: 'Advanced programming and software development techniques including version control, debugging, testing, and working with large codebases. Team-based development and software engineering practices.',
    credits: 4,
    prereqs: ['CS 1110'],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: [],
    department: 'CS',
    level: 2000,
    school: 'School of Engineering and Applied Science'
  },
  {
    id: 'CS 2150',
    title: 'Program and Data Representation',
    description: 'Explores data structures, algorithms, and memory organization in C++. Topics include dynamic memory allocation, linked lists, stacks, queues, trees, graphs, and algorithm analysis.',
    credits: 3,
    prereqs: ['CS 2110'],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: [],
    department: 'CS',
    level: 2000,
    school: 'School of Engineering and Applied Science'
  },
  {
    id: 'CS 3330',
    title: 'Computer Architecture',
    description: 'Digital logic design, machine language, processor design, memory systems, and I/O. Assembly language programming and computer system performance analysis.',
    credits: 4,
    prereqs: ['CS 2150'],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: [],
    department: 'CS',
    level: 3000,
    school: 'School of Engineering and Applied Science'
  },
  {
    id: 'CS 4102',
    title: 'Algorithms',
    description: 'Analysis and design of algorithms including divide-and-conquer, greedy algorithms, dynamic programming, graph algorithms, and complexity theory.',
    credits: 3,
    prereqs: ['CS 2150', 'MATH 2310'],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: [],
    department: 'CS',
    level: 4000,
    school: 'School of Engineering and Applied Science'
  },

  // Mathematics
  {
    id: 'MATH 1310',
    title: 'Calculus I',
    description: 'Functions, limits, derivatives and their applications, beginning integral calculus. Designed for students of engineering and science.',
    credits: 4,
    prereqs: [],
    semestersOffered: ['Fall', 'Spring', 'Summer'],
    fulfills: ['Quantitative Reasoning'],
    department: 'MATH',
    level: 1000,
    school: 'College of Arts & Sciences'
  },
  {
    id: 'MATH 1320',
    title: 'Calculus II',
    description: 'Continuation of Calculus I. Integration techniques, applications of integration, sequences and series, parametric equations, and polar coordinates.',
    credits: 4,
    prereqs: ['MATH 1310'],
    semestersOffered: ['Fall', 'Spring', 'Summer'],
    fulfills: ['Quantitative Reasoning'],
    department: 'MATH',
    level: 1000,
    school: 'College of Arts & Sciences'
  },
  {
    id: 'MATH 2310',
    title: 'Calculus III',
    description: 'Multivariate calculus including partial derivatives, multiple integrals, vector calculus, and applications to physics and engineering.',
    credits: 4,
    prereqs: ['MATH 1320'],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: [],
    department: 'MATH',
    level: 2000,
    school: 'College of Arts & Sciences'
  },

  // Biology
  {
    id: 'BIOL 2100',
    title: 'Cell Biology and Genetics',
    description: 'Introduction to cell structure and function, molecular genetics, and inheritance patterns. Laboratory exercises complement lecture topics.',
    credits: 4,
    prereqs: ['CHEM 1410'],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: ['Natural Science'],
    department: 'BIOL',
    level: 2000,
    school: 'College of Arts & Sciences'
  },
  {
    id: 'BIOL 2200',
    title: 'Organismal Biology and Evolution',
    description: 'Survey of major groups of organisms, evolutionary theory, ecology, and animal behavior. Laboratory and field studies.',
    credits: 4,
    prereqs: ['BIOL 2100'],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: ['Natural Science'],
    department: 'BIOL',
    level: 2000,
    school: 'College of Arts & Sciences'
  },

  // Chemistry
  {
    id: 'CHEM 1410',
    title: 'General Chemistry I',
    description: 'Atomic structure, bonding, stoichiometry, thermodynamics, and kinetics. Laboratory work emphasizes quantitative analysis.',
    credits: 4,
    prereqs: [],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: ['Natural Science'],
    department: 'CHEM',
    level: 1000,
    school: 'College of Arts & Sciences'
  },
  {
    id: 'CHEM 1420',
    title: 'General Chemistry II',
    description: 'Continuation of General Chemistry I. Equilibrium, acids and bases, electrochemistry, and descriptive chemistry.',
    credits: 4,
    prereqs: ['CHEM 1410'],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: ['Natural Science'],
    department: 'CHEM',
    level: 1000,
    school: 'College of Arts & Sciences'
  },

  // Physics
  {
    id: 'PHYS 1425',
    title: 'Physics I',
    description: 'Mechanics, wave motion, and thermodynamics with applications to engineering and science. Calculus-based course.',
    credits: 3,
    prereqs: ['MATH 1310'],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: ['Natural Science'],
    department: 'PHYS',
    level: 1000,
    school: 'College of Arts & Sciences'
  },
  {
    id: 'PHYS 1429',
    title: 'Physics II',
    description: 'Electricity, magnetism, and modern physics. Continuation of Physics I with applications to engineering and science.',
    credits: 3,
    prereqs: ['PHYS 1425', 'MATH 1320'],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: ['Natural Science'],
    department: 'PHYS',
    level: 1000,
    school: 'College of Arts & Sciences'
  },

  // Psychology
  {
    id: 'PSYC 1010',
    title: 'Introduction to Psychology',
    description: 'Scientific study of behavior and mental processes including learning, memory, perception, cognition, personality, and social psychology.',
    credits: 3,
    prereqs: [],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: ['Social Science'],
    department: 'PSYC',
    level: 1000,
    school: 'College of Arts & Sciences'
  },

  // Economics
  {
    id: 'ECON 2010',
    title: 'Principles of Microeconomics',
    description: 'Individual and firm decision-making, market structures, resource allocation, and government intervention in markets.',
    credits: 3,
    prereqs: [],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: ['Social Science'],
    department: 'ECON',
    level: 2000,
    school: 'College of Arts & Sciences'
  },
  {
    id: 'ECON 2020',
    title: 'Principles of Macroeconomics',
    description: 'National income, employment, inflation, monetary and fiscal policy, and international trade.',
    credits: 3,
    prereqs: [],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: ['Social Science'],
    department: 'ECON',
    level: 2000,
    school: 'College of Arts & Sciences'
  },

  // English
  {
    id: 'ENGL 1010',
    title: 'Writing and Rhetoric',
    description: 'Academic writing with emphasis on analysis, argumentation, and research. Multiple drafts and peer review.',
    credits: 3,
    prereqs: [],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: ['Writing Requirement'],
    department: 'ENGL',
    level: 1000,
    school: 'College of Arts & Sciences'
  },

  // Commerce
  {
    id: 'COMM 2010',
    title: 'Introduction to Business',
    description: 'Overview of business functions including management, marketing, finance, and operations in global economy.',
    credits: 3,
    prereqs: [],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: [],
    department: 'COMM',
    level: 2000,
    school: 'McIntire School of Commerce'
  },

  // Engineering
  {
    id: 'ENGR 1624',
    title: 'Introduction to Engineering',
    description: 'Engineering design process, teamwork, communication, and introduction to engineering disciplines. Hands-on design projects.',
    credits: 2,
    prereqs: [],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: [],
    department: 'ENGR',
    level: 1000,
    school: 'School of Engineering and Applied Science'
  },

  // Applied Mathematics
  {
    id: 'APMA 3080',
    title: 'Linear Algebra',
    description: 'Vector spaces, linear transformations, matrices, eigenvalues and eigenvectors, and applications to engineering and science.',
    credits: 3,
    prereqs: ['MATH 1320'],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: [],
    department: 'APMA',
    level: 3000,
    school: 'School of Engineering and Applied Science'
  },

  // Statistics
  {
    id: 'STAT 2120',
    title: 'Introduction to Statistical Analysis',
    description: 'Descriptive statistics, probability, sampling distributions, hypothesis testing, confidence intervals, and regression analysis.',
    credits: 3,
    prereqs: ['MATH 1310'],
    semestersOffered: ['Fall', 'Spring'],
    fulfills: ['Quantitative Reasoning'],
    department: 'STAT',
    level: 2000,
    school: 'College of Arts & Sciences'
  }
];

export async function scrapeCoursesFromLousList(testMode: boolean = false): Promise<ScrapingResult<RawCourse>> {
  try {
    logProgress(`Starting UVA courses scraping from Lou's List Course Catalog`);

    const rawCourses: RawCourse[] = [];
    const errors: string[] = [];
    const departmentList = Object.keys(DEPARTMENTS);

    // For testing, only scrape CS department
    const departmentsToScrape = testMode ? ['CS'] : departmentList;

    logProgress(`Scraping ${departmentsToScrape.length} departments: ${departmentsToScrape.join(', ')}`);

    // Scrape each department
    for (const deptCode of departmentsToScrape) {
      try {
        logProgress(`\n--- Starting ${deptCode} (${DEPARTMENTS[deptCode as keyof typeof DEPARTMENTS]}) ---`);

        const deptCourses = await scrapeDepartmentCourses(deptCode);

        if (deptCourses.length > 0) {
          rawCourses.push(...deptCourses);
          logProgress(`✓ ${deptCode}: Successfully scraped ${deptCourses.length} courses`);
        } else {
          const warning = `${deptCode}: No courses found`;
          logProgress(`⚠ ${warning}`);
          errors.push(warning);
        }

        // Rate limiting between departments
        if (departmentsToScrape.indexOf(deptCode) < departmentsToScrape.length - 1) {
          await new Promise(resolve => setTimeout(resolve, COURSES_CONFIG.rateLimit));
        }

      } catch (deptError) {
        const errorMsg = `${deptCode}: ${deptError instanceof Error ? deptError.message : 'Unknown error'}`;
        console.error(`Error scraping ${deptCode}:`, deptError);
        errors.push(errorMsg);
      }
    }

    logProgress(`\n=== Scraping Complete ===`);
    logProgress(`Total courses scraped: ${rawCourses.length}`);
    logProgress(`Departments with errors: ${errors.length}`);

    if (rawCourses.length === 0) {
      return createErrorResult([
        'No courses were scraped from any department',
        ...errors
      ]);
    }

    return createSuccessResult(
      rawCourses,
      `Successfully scraped ${rawCourses.length} courses from ${departmentsToScrape.length - errors.length}/${departmentsToScrape.length} departments`
    );

  } catch (error) {
    const errorMessage = `Failed to scrape UVA courses: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage, error);
    return createErrorResult([errorMessage]);
  }
}

// Generate additional courses for comprehensive testing
function generateAdditionalCourses(): RawCourse[] {
  const additionalCourses: RawCourse[] = [];

  // Advanced CS courses
  const advancedCSCourses = [
    {
      id: 'CS 3240',
      title: 'Advanced Software Development',
      description: 'Software engineering principles for large-scale development including agile methodologies, design patterns, and web frameworks.',
      credits: 3,
      prereqs: ['CS 2110'],
      semestersOffered: ['Fall', 'Spring'],
      fulfills: [],
      department: 'CS',
      level: 3000,
      school: 'School of Engineering and Applied Science'
    },
    {
      id: 'CS 4720',
      title: 'Web and Mobile Systems',
      description: 'Full-stack web development, mobile application development, and distributed systems architecture.',
      credits: 3,
      prereqs: ['CS 2110'],
      semestersOffered: ['Fall', 'Spring'],
      fulfills: [],
      department: 'CS',
      level: 4000,
      school: 'School of Engineering and Applied Science'
    },
    {
      id: 'CS 4774',
      title: 'Machine Learning',
      description: 'Supervised and unsupervised learning algorithms, neural networks, and applications to data science.',
      credits: 3,
      prereqs: ['CS 2150', 'MATH 2310', 'STAT 2120'],
      semestersOffered: ['Fall', 'Spring'],
      fulfills: [],
      department: 'CS',
      level: 4000,
      school: 'School of Engineering and Applied Science'
    }
  ];

  // Additional Math courses
  const mathCourses = [
    {
      id: 'MATH 3250',
      title: 'Ordinary Differential Equations',
      description: 'First and higher order differential equations, systems of equations, and applications to physical sciences.',
      credits: 3,
      prereqs: ['MATH 2310'],
      semestersOffered: ['Fall', 'Spring'],
      fulfills: [],
      department: 'MATH',
      level: 3000,
      school: 'College of Arts & Sciences'
    },
    {
      id: 'MATH 4210',
      title: 'Real Analysis I',
      description: 'Rigorous treatment of limits, continuity, differentiation, and integration on the real line.',
      credits: 3,
      prereqs: ['MATH 2310'],
      semestersOffered: ['Fall'],
      fulfills: [],
      department: 'MATH',
      level: 4000,
      school: 'College of Arts & Sciences'
    }
  ];

  // Additional Science courses
  const scienceCourses = [
    {
      id: 'BIOL 3000',
      title: 'Ecology',
      description: 'Interactions between organisms and their environment including population dynamics, community ecology, and ecosystem processes.',
      credits: 3,
      prereqs: ['BIOL 2200'],
      semestersOffered: ['Fall', 'Spring'],
      fulfills: ['Natural Science'],
      department: 'BIOL',
      level: 3000,
      school: 'College of Arts & Sciences'
    },
    {
      id: 'CHEM 2410',
      title: 'Organic Chemistry I',
      description: 'Structure, bonding, and reactions of organic compounds including alkanes, alkenes, and aromatic compounds.',
      credits: 3,
      prereqs: ['CHEM 1420'],
      semestersOffered: ['Fall', 'Spring'],
      fulfills: [],
      department: 'CHEM',
      level: 2000,
      school: 'College of Arts & Sciences'
    }
  ];

  additionalCourses.push(...advancedCSCourses, ...mathCourses, ...scienceCourses);

  return additionalCourses;
}

// Helper function to build Lou's List catalog URL for a department
function buildLousListUrl(department: string): string {
  const baseUrl = COURSES_CONFIG.baseUrl;
  return `${baseUrl}/${department}.html`;
}

// Helper function to parse course HTML element from Lou's List
function parseLousListCourse($: cheerio.CheerioAPI, element: cheerio.Element, department: string): RawCourse | null {
  try {
    const $elem = $(element);
    const text = $elem.text();

    // Extract course number (e.g., "CS 1110")
    const courseNumMatch = text.match(/([A-Z]{2,4})\s*(\d{4}[A-Z]?)/);
    if (!courseNumMatch) return null;

    const courseId = `${courseNumMatch[1]} ${courseNumMatch[2]}`;

    // Extract course title (usually after the course number)
    const titleMatch = text.match(/\d{4}[A-Z]?\s*[-–—]\s*([^(]+)/);
    const title = titleMatch ? cleanText(titleMatch[1]) : 'Untitled Course';

    // Extract credits (look for patterns like "(3)" or "3 credits")
    const creditsMatch = text.match(/\((\d+)\)|(\d+)\s*credit/i);
    const credits = creditsMatch ? parseInt(creditsMatch[1] || creditsMatch[2]) : 3;

    // Extract description (usually longer text blocks)
    let description = '';
    const descMatch = text.match(/[-–—]\s*([^.]+(?:\.[^.]+){0,3})/);
    if (descMatch) {
      description = cleanText(descMatch[1]);
    }

    // Try to find prerequisites in the text
    const prereqMatch = text.match(/prerequisite[s]?:?\s*([^.]+)/i) ||
                       text.match(/require[sd]?:?\s*([^.]+)/i);
    const prereqs = prereqMatch ? parsePrerequisites(prereqMatch[1]) : [];

    // Determine school and level
    const school = mapDepartmentToSchool(department);
    const level = getCourseLevel(courseId);

    return {
      id: courseId,
      title,
      description: description || 'No description available.',
      credits,
      prereqs,
      semestersOffered: ['Fall', 'Spring'], // Default
      fulfills: [],
      department,
      level,
      school
    };
  } catch (error) {
    console.error('Error parsing course element:', error);
    return null;
  }
}

// Scrape course details from specific department using Lou's List HTML
async function scrapeDepartmentCourses(department: string): Promise<RawCourse[]> {
  const courses: RawCourse[] = [];

  logProgress(`Scraping ${department} courses from Lou's List Course Catalog`);

  try {
    const url = buildLousListUrl(department);
    const html = await fetchWithRetry(url, COURSES_CONFIG);
    const $ = parseHtml(html);

    // Lou's List uses a table structure with alternating rows:
    // Row 1: <td class="CourseNum">DEPT 1234</td><td class="CourseName">Title (Credits)</td>
    // Row 2: <td class="Offered">...</td><td class="CourseDescription">Description...</td>

    const courseNumRows = $('td.CourseNum').toArray();

    for (const numCell of courseNumRows) {
      try {
        const $numCell = $(numCell);
        const courseNumText = cleanText($numCell.text());

        // Get the course name cell (next sibling)
        const $nameCell = $numCell.next('td.CourseName');
        const courseNameText = cleanText($nameCell.text());

        // Extract course ID
        const courseId = standardizeCourseId(courseNumText);

        // Extract title and credits from course name
        // Format: "Course Title (3)" or "Course Title"
        const titleMatch = courseNameText.match(/^(.+?)\s*\((\d+)\)\s*$/);
        let title = titleMatch ? cleanText(titleMatch[1]) : courseNameText;
        const credits = titleMatch ? parseInt(titleMatch[2]) : 3;

        // Get the description row (next table row)
        const $descRow = $numCell.parent().next('tr');
        const $descCell = $descRow.find('td.CourseDescription');
        let descriptionText = $descCell.text();

        // Remove "Course was offered..." section
        descriptionText = descriptionText.split('Course was offered')[0];
        const description = cleanText(descriptionText) || 'No description available.';

        // Extract prerequisites from description
        const prereqMatch = description.match(/prerequisite[s]?:?\s*([^.]+)/i) ||
                           description.match(/prereq[s]?:?\s*([^.]+)/i);
        const prereqs = prereqMatch ? parsePrerequisites(prereqMatch[1]) : [];

        // Check for duplicates
        const isDuplicate = courses.some(c => c.id === courseId);
        if (!isDuplicate && courseId.startsWith(department)) {
          courses.push({
            id: courseId,
            title,
            description,
            credits,
            prereqs,
            semestersOffered: ['Fall', 'Spring'],
            fulfills: [],
            department,
            level: getCourseLevel(courseId),
            school: mapDepartmentToSchool(department)
          });
        }

      } catch (parseError) {
        // Skip this course if parsing fails
        continue;
      }
    }

    logProgress(`Completed ${department}: ${courses.length} courses scraped`);
    return courses;

  } catch (error) {
    // Check if it's a 404 (page doesn't exist for this department)
    if (error instanceof Error && error.message.includes('404')) {
      logProgress(`${department}: Course catalog page not found (404)`);
      return [];
    }

    console.error(`Error scraping ${department}:`, error);
    return courses; // Return whatever we managed to scrape
  }
}

// Main function to scrape, normalize, and save courses data
export async function processCoursesData(): Promise<void> {
  try {
    logProgress('Processing UVA courses data');

    // Scrape raw data
    const scrapingResult = await scrapeCoursesFromLousList();

    if (!scrapingResult.success) {
      throw new Error(`Scraping failed: ${scrapingResult.errors.join(', ')}`);
    }

    // Normalize data
    const normalizedCourses = normalizeCourses(scrapingResult.data);
    const deduplicatedCourses = deduplicateCourses(normalizedCourses);

    // Validate data
    const { validCourses, errors } = validateCourses(deduplicatedCourses);

    if (errors.length > 0) {
      console.warn('Validation errors found:', errors);
    }

    // Save raw data
    const rawDataPath = path.join(process.cwd(), 'data', 'raw', 'raw-courses.json');
    fs.mkdirSync(path.dirname(rawDataPath), { recursive: true });
    fs.writeFileSync(rawDataPath, JSON.stringify(scrapingResult.data, null, 2));

    // Save normalized data
    const courseData = {
      lastUpdated: new Date().toISOString(),
      semester: 'Fall 2025',
      courses: validCourses
    };

    const outputPath = path.join(process.cwd(), 'data', 'courses.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(courseData, null, 2));

    logProgress(`Successfully processed ${validCourses.length} courses`);
    logProgress(`Data saved to ${outputPath}`);

    if (errors.length > 0) {
      logProgress(`${errors.length} validation errors encountered`, errors);
    }

  } catch (error) {
    console.error('Error processing courses data:', error);
    throw error;
  }
}

// Export for use in npm scripts
if (require.main === module) {
  processCoursesData()
    .then(() => {
      console.log('Courses scraping completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Courses scraping failed:', error);
      process.exit(1);
    });
}