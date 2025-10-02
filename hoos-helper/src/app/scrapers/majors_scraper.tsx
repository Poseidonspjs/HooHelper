// UVA Majors and Minors Scraper
// Scrapes major/minor data from https://www.virginia.edu/majors-minors/
// and normalizes it according to PRD schema requirements

import { RawMajor, ScrapingResult, ScraperConfig } from './types';
import {
  fetchWithRetry,
  parseHtml,
  cleanText,
  createSuccessResult,
  createErrorResult,
  logProgress,
  defaultScraperConfig
} from './utils/scraper-utils';
import { normalizeMajors, deduplicateMajors } from './utils/normalizer';
import { validateMajors } from './utils/data-validator';
import * as fs from 'fs';
import * as path from 'path';

const MAJORS_CONFIG: ScraperConfig = {
  ...defaultScraperConfig,
  baseUrl: 'https://www.virginia.edu',
  rateLimit: 2000, // 2 second delay between requests
  retryAttempts: 3,
  timeout: 30000
};

// UVA Schools mapping for better categorization
const UVA_SCHOOLS = {
  'School of Engineering and Applied Science': [
    'Computer Science', 'Electrical Engineering', 'Mechanical Engineering',
    'Civil Engineering', 'Biomedical Engineering', 'Chemical Engineering',
    'Systems Engineering', 'Aerospace Engineering', 'Applied Mathematics'
  ],
  'McIntire School of Commerce': [
    'Commerce'
  ],
  'College of Arts & Sciences': [
    'Biology', 'Chemistry', 'Physics', 'Mathematics', 'Psychology',
    'Economics', 'English', 'History', 'Political Science', 'Philosophy',
    'Anthropology', 'Sociology', 'Art', 'Music', 'Drama', 'Spanish',
    'French', 'German', 'Italian', 'Classics', 'Religious Studies'
  ],
  'School of Architecture': [
    'Architecture', 'Landscape Architecture', 'Urban Planning'
  ],
  'School of Nursing': [
    'Nursing'
  ],
  'School of Education and Human Development': [
    'Education', 'Kinesiology', 'Human Services'
  ],
  'Frank Batten School of Leadership and Public Policy': [
    'Public Policy', 'Leadership Studies'
  ],
  'School of Data Science': [
    'Data Science', 'Statistics'
  ]
};

// Focus areas mapping for common majors
const FOCUS_AREAS_MAP: Record<string, string[]> = {
  'Computer Science': [
    'Software Development', 'Data Science', 'Cybersecurity', 'AI/Machine Learning',
    'Human-Computer Interaction', 'Computer Graphics', 'Systems and Networks'
  ],
  'Biology': [
    'Pre-Med', 'Research', 'Environmental Biology', 'Molecular Biology',
    'Cell Biology', 'Ecology', 'Biochemistry'
  ],
  'Psychology': [
    'Clinical Psychology', 'Cognitive Psychology', 'Social Psychology',
    'Developmental Psychology', 'Behavioral Neuroscience'
  ],
  'Economics': [
    'Public Policy', 'Finance', 'International Economics', 'Behavioral Economics',
    'Development Economics'
  ],
  'English': [
    'Literature', 'Creative Writing', 'Rhetoric', 'Linguistics',
    'Medieval Studies', 'American Literature'
  ],
  'History': [
    'American History', 'European History', 'World History', 'Public History',
    'Military History', 'Cultural History'
  ],
  'Political Science': [
    'International Relations', 'Public Administration', 'Political Theory',
    'Comparative Politics', 'American Government'
  ],
  'Mathematics': [
    'Pure Mathematics', 'Applied Mathematics', 'Statistics', 'Actuarial Science',
    'Mathematical Finance'
  ],
  'Physics': [
    'Theoretical Physics', 'Experimental Physics', 'Astrophysics',
    'Condensed Matter Physics', 'Medical Physics'
  ],
  'Chemistry': [
    'Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry',
    'Biochemistry', 'Materials Chemistry'
  ]
};

// Core requirements mapping for major programs
const CORE_REQUIREMENTS_MAP: Record<string, string[]> = {
  'Computer Science': [
    'CS 1110', 'CS 2110', 'CS 2150', 'CS 3330', 'CS 4102',
    'MATH 1310', 'MATH 1320', 'MATH 2310', 'APMA 3080'
  ],
  'Biology': [
    'BIOL 2100', 'BIOL 2200', 'BIOL 3000', 'CHEM 1410', 'CHEM 1420',
    'CHEM 2410', 'CHEM 2420', 'MATH 1310', 'PHYS 1425', 'PHYS 1429'
  ],
  'Psychology': [
    'PSYC 1010', 'PSYC 2005', 'PSYC 3005', 'PSYC 4998',
    'STAT 2020', 'BIOL 1010'
  ],
  'Economics': [
    'ECON 2010', 'ECON 2020', 'ECON 3010', 'ECON 3020',
    'MATH 1310', 'MATH 1320', 'STAT 2120'
  ],
  'Mathematics': [
    'MATH 1310', 'MATH 1320', 'MATH 2310', 'MATH 3250',
    'MATH 3310', 'MATH 4210', 'MATH 4220'
  ]
};

// AP Credits mapping for majors
const AP_CREDITS_MAP: Record<string, string[]> = {
  'Computer Science': [
    'AP Computer Science A', 'AP Computer Science Principles',
    'AP Calculus BC', 'AP Physics C: Mechanics', 'AP Physics C: Electricity and Magnetism'
  ],
  'Biology': [
    'AP Biology', 'AP Chemistry', 'AP Physics 1', 'AP Physics 2',
    'AP Calculus BC', 'AP Statistics'
  ],
  'Psychology': [
    'AP Psychology', 'AP Statistics', 'AP Biology', 'AP Research'
  ],
  'Economics': [
    'AP Macroeconomics', 'AP Microeconomics', 'AP Statistics',
    'AP Calculus BC', 'AP Government and Politics'
  ],
  'Mathematics': [
    'AP Calculus BC', 'AP Statistics', 'AP Physics C: Mechanics',
    'AP Physics C: Electricity and Magnetism', 'AP Computer Science A'
  ]
};

export async function scrapeMajorsFromUVA(): Promise<ScrapingResult<RawMajor>> {
  try {
    logProgress('Starting UVA majors scraping from majors-minors page');

    const url = 'https://www.virginia.edu/majors-minors/';
    const html = await fetchWithRetry(url, MAJORS_CONFIG);
    const $ = parseHtml(html);

    const rawMajors: RawMajor[] = [];
    const rawMinors: RawMajor[] = [];

    // The page has a simple list structure with links to programs
    // Find all links that look like they point to majors/minors
    const foundPrograms = new Set<string>(); // Track duplicates

    $('li a').each((index, element) => {
      const link = $(element);
      const programName = cleanText(link.text());
      const programUrl = link.attr('href');

      // Filter out navigation links, empty links, and very short text
      if (programName && programUrl && programName.length > 2 && !foundPrograms.has(programName)) {
        // Only include links that point to UVA subdomains or majors/programs
        const lowerUrl = programUrl.toLowerCase();
        const isUVALink = lowerUrl.includes('virginia.edu') || programUrl.startsWith('/');

        // Exclude navigation, utility, footer links, and non-academic content
        const lowerProgramName = programName.toLowerCase();
        const isNavigationLink = lowerUrl.includes('sisuva') ||
                                 lowerUrl.includes('canvas') ||
                                 lowerUrl.includes('/email') ||
                                 lowerUrl.includes('/jobs') ||
                                 lowerUrl.includes('/directory') ||
                                 lowerUrl.includes('hr.virginia.edu') ||
                                 lowerUrl.includes('search.people.virginia.edu') ||
                                 lowerUrl.includes('iso.virginia.edu') ||
                                 lowerUrl.includes('/about-uva') ||
                                 lowerUrl.includes('/admission') ||
                                 lowerUrl.includes('/research') ||
                                 lowerUrl.includes('/tuition') ||
                                 lowerUrl.includes('/life-uva') ||
                                 lowerUrl.includes('/visit') ||
                                 lowerUrl.includes('/mission') ||
                                 lowerUrl.includes('/facts-figures') ||
                                 lowerUrl.includes('/academics/') && !lowerUrl.includes('programs') ||
                                 lowerUrl.includes('president.virginia.edu') ||
                                 lowerUrl.includes('strategicplan') ||
                                 lowerUrl.includes('giving.virginia.edu') ||
                                 lowerUrl.includes('registrar.virginia.edu') ||
                                 lowerUrl.includes('online.virginia.edu') && !lowerUrl.includes('/programs') ||
                                 lowerUrl.includes('/continuing-executive') ||
                                 lowerUrl.includes('/international-studies/') ||
                                 lowerUrl.includes('/january-term') ||
                                 lowerUrl.includes('/graduate-admission') ||
                                 lowerUrl.includes('/graduate-studies/') ||
                                 lowerUrl.includes('/undergraduate-studies/') ||
                                 lowerUrl.includes('students.virginia.edu') ||
                                 lowerUrl.includes('accessibility.virginia.edu') ||
                                 lowerUrl.includes('/consumer-information') ||
                                 lowerUrl.includes('/contact-us') ||
                                 lowerUrl.includes('uvaemergency') ||
                                 lowerUrl.includes('/foia') ||
                                 lowerUrl.includes('/privacy') ||
                                 lowerUrl.includes('eocr.virginia.edu') ||
                                 lowerUrl.includes('/libraries') ||
                                 lowerUrl.includes('/arts-uva') ||
                                 lowerUrl.includes('academic-affairs.provost') ||
                                 lowerUrl.includes('rotc.virginia.edu') && !lowerUrl.includes('arotc') && !lowerUrl.includes('nrotc') && !lowerUrl.includes('afrotc') ||
                                 lowerUrl.includes('/open-learning') ||
                                 lowerUrl.includes('certificate') && !lowerUrl.includes('/programs/') ||
                                 lowerUrl.includes('/awards-and-honors') ||
                                 lowerUrl.includes('/special-programs') ||
                                 lowerUrl.includes('/academic-skills') ||
                                 lowerUrl.includes('/kinesiology') && lowerUrl.includes('physical-activity') ||
                                 lowerProgramName === 'home' ||
                                 lowerProgramName === 'jobs' ||
                                 lowerProgramName === 'directory' ||
                                 lowerProgramName === 'international studies' ||
                                 lowerProgramName.includes('seminar') ||
                                 lowerProgramName === 'academics' ||
                                 lowerProgramName === 'schools' ||
                                 lowerProgramName === 'libraries' ||
                                 lowerProgramName === 'arts' ||
                                 lowerProgramName.includes('calendar') ||
                                 lowerProgramName.includes('rotc') && !lowerProgramName.includes('air force') && !lowerProgramName.includes('army') && !lowerProgramName.includes('naval');

        if (isUVALink && !isNavigationLink) {
          foundPrograms.add(programName);

          // Build full URL
          const fullUrl = programUrl.startsWith('http') ? programUrl : `${MAJORS_CONFIG.baseUrl}${programUrl}`;

          // Check if this program offers multiple degrees (e.g., "Computer Science, B.A. and B.S.")
          const multiDegreePrograms = parseMultiDegreeProgram(programName);

          if (multiDegreePrograms) {
            // Create separate entry for each degree
            for (const { name: cleanName, degree } of multiDegreePrograms) {
              const school = inferSchoolFromUrl(fullUrl) || inferSchoolFromName(cleanName);
              const isMajor = !isMinorProgram(cleanName);

              const program: RawMajor = {
                name: cleanName,
                degree,
                school,
                focusAreas: FOCUS_AREAS_MAP[cleanName] || [],
                sourceUrl: fullUrl,
                description: isMajor ? `Major in ${cleanName}` : `Minor in ${cleanName}`
              };

              if (isMajor) {
                rawMajors.push(program);
              } else {
                rawMinors.push(program);
              }
            }
          } else {
            // Parse single degree program (may have degree suffix like "Data Science, B.S.")
            const { name: cleanName, degree: explicitDegree } = parseProgramNameAndDegree(programName);

            // If degree is explicitly in the name, use it; otherwise infer it
            let degree: string;
            let school: string;
            let isMajor: boolean;

            if (explicitDegree) {
              // Use explicit degree from program name
              degree = explicitDegree;
              school = inferSchoolFromUrl(fullUrl) || inferSchoolFromName(cleanName);
              isMajor = !isMinorProgram(cleanName);
            } else {
              // Infer degree, school, and major/minor status
              const inferred = inferDegreeAndSchool(cleanName, fullUrl);
              degree = inferred.degree;
              school = inferred.school;
              isMajor = inferred.isMajor;
            }

            const program: RawMajor = {
              name: cleanName,
              degree,
              school,
              focusAreas: FOCUS_AREAS_MAP[cleanName] || [],
              sourceUrl: fullUrl,
              description: isMajor ? `Major in ${cleanName}` : `Minor in ${cleanName}`
            };

            if (isMajor) {
              rawMajors.push(program);
            } else {
              rawMinors.push(program);
            }
          }
        }
      }
    });

    logProgress(`Scraped ${rawMajors.length} majors and ${rawMinors.length} minors from UVA page`);

    // For now, only return majors (as per PRD focus)
    // Minors can be integrated later if needed
    return createSuccessResult(rawMajors, `Successfully scraped ${rawMajors.length} majors`);

  } catch (error) {
    const errorMessage = `Failed to scrape UVA majors: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage, error);
    return createErrorResult([errorMessage]);
  }
}

// Infer school from URL domain patterns
function inferSchoolFromUrl(url: string): string | null {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('engineering.virginia.edu') || lowerUrl.includes('/seas/')) {
    return 'School of Engineering and Applied Science';
  }
  if (lowerUrl.includes('commerce.virginia.edu') || lowerUrl.includes('mcintire')) {
    return 'McIntire School of Commerce';
  }
  if (lowerUrl.includes('nursing.virginia.edu')) {
    return 'School of Nursing';
  }
  if (lowerUrl.includes('arch.virginia.edu') || lowerUrl.includes('architecture')) {
    return 'School of Architecture';
  }
  if (lowerUrl.includes('education.virginia.edu') || lowerUrl.includes('/curry/')) {
    return 'School of Education and Human Development';
  }
  if (lowerUrl.includes('batten.virginia.edu')) {
    return 'Frank Batten School of Leadership and Public Policy';
  }
  if (lowerUrl.includes('datascience.virginia.edu') || lowerUrl.includes('/dsi/')) {
    return 'School of Data Science';
  }
  if (lowerUrl.includes('as.virginia.edu') || lowerUrl.includes('/arts-sciences/')) {
    return 'College of Arts & Sciences';
  }

  return null; // Unknown, will use name-based inference
}

// Detect if program is a minor based on name
function isMinorProgram(name: string): boolean {
  const lowerName = name.toLowerCase();
  return lowerName.includes('minor') || lowerName.endsWith(' - minor');
}

// Parse program name and extract degree suffix if present
// Example: "Data Science, B.S." -> { name: "Data Science", degree: "B.S." }
// Example: "Biology" -> { name: "Biology", degree: null }
// Example: "Early Childhood Education, B.S.Ed." -> { name: "Early Childhood Education", degree: "B.S.Ed." }
function parseProgramNameAndDegree(programName: string): { name: string; degree: string | null } {
  // Match patterns like ", B.S." or ", B.A." or ", B.S.Ed." or ", B.Arch." at the end
  // Pattern matches: B. + letters + . + optional (letters + .)
  const degreePattern = /,\s*(B\.[A-Za-z]+\.(?:[A-Za-z]+\.)?)\s*$/;
  const match = programName.match(degreePattern);

  if (match) {
    const cleanName = programName.replace(degreePattern, '').trim();
    const degree = match[1];
    return { name: cleanName, degree };
  }

  return { name: programName, degree: null };
}

// Parse programs that offer multiple degrees (e.g., "Computer Science, B.A. and B.S.")
// Returns array of program entries, one for each degree
function parseMultiDegreeProgram(programName: string): { name: string; degree: string }[] | null {
  // Match pattern like "Program Name, B.A. and B.S."
  // Pattern matches: B. + letters + . for each degree
  const multiDegreePattern = /^(.+?),\s*(B\.[A-Za-z]+\.(?:[A-Za-z]+\.)?)\s+and\s+(B\.[A-Za-z]+\.(?:[A-Za-z]+\.)?)\s*$/;
  const match = programName.match(multiDegreePattern);

  if (match) {
    const cleanName = match[1].trim();
    const degree1 = match[2];
    const degree2 = match[3];
    return [
      { name: cleanName, degree: degree1 },
      { name: cleanName, degree: degree2 }
    ];
  }

  return null;
}

// Infer degree type and school from major name and URL
function inferDegreeAndSchool(majorName: string, sourceUrl: string = ''): { degree: string; school: string; isMajor: boolean } {
  const lowerName = majorName.toLowerCase();
  const isMajor = !isMinorProgram(majorName);

  // First try to infer school from URL if available
  let school = sourceUrl ? inferSchoolFromUrl(sourceUrl) : null;

  // Fall back to name-based inference if URL didn't work
  if (!school) {
    school = inferSchoolFromName(majorName);
  }

  // Check for explicit degree mentions in name
  if (lowerName.includes('b.s.') || lowerName.includes('bachelor of science')) {
    return { degree: 'B.S.', school, isMajor };
  }
  if (lowerName.includes('b.a.') || lowerName.includes('bachelor of arts')) {
    return { degree: 'B.A.', school, isMajor };
  }
  if (lowerName.includes('b.s.ed.') || lowerName.includes('education')) {
    return { degree: 'B.S.Ed.', school: 'School of Education and Human Development', isMajor };
  }
  if (lowerName.includes('architecture')) {
    return { degree: 'B.Arch.', school: 'School of Architecture', isMajor };
  }
  if (lowerName.includes('nursing')) {
    return { degree: 'B.S.N.', school: 'School of Nursing', isMajor };
  }

  // Default inference based on typical UVA patterns
  let degree = 'B.A.'; // Default

  // Engineering and science majors typically award B.S.
  if (school === 'School of Engineering and Applied Science' ||
      lowerName.includes('science') || lowerName.includes('engineering') ||
      lowerName.includes('mathematics') || lowerName.includes('computer')) {
    degree = 'B.S.';
  }

  // Commerce majors
  if (lowerName.includes('commerce') || lowerName.includes('business')) {
    degree = 'B.S.';
  }

  // Data Science
  if (lowerName.includes('data science')) {
    degree = 'B.S.';
  }

  return { degree, school, isMajor };
}

// Infer school from major name
function inferSchoolFromName(majorName: string): string {
  const lowerName = majorName.toLowerCase();

  for (const [school, majors] of Object.entries(UVA_SCHOOLS)) {
    for (const major of majors) {
      if (lowerName.includes(major.toLowerCase())) {
        return school;
      }
    }
  }

  return 'College of Arts & Sciences'; // Default
}

// This function is no longer needed as we're scraping real data
// Kept for reference in case fallback is needed
function generateAdditionalMajors(): RawMajor[] {
  // This function has been deprecated in favor of real scraping
  return [];
}

// Main function to scrape, normalize, and save majors data
export async function processMajorsData(): Promise<void> {
  try {
    logProgress('Processing UVA majors data');

    // Scrape raw data
    const scrapingResult = await scrapeMajorsFromUVA();

    if (!scrapingResult.success) {
      throw new Error(`Scraping failed: ${scrapingResult.errors.join(', ')}`);
    }

    // Normalize data
    const normalizedMajors = normalizeMajors(scrapingResult.data);
    const deduplicatedMajors = deduplicateMajors(normalizedMajors);

    // Add detailed requirements for known majors
    const enrichedMajors = deduplicatedMajors.map(major => ({
      ...major,
      requirements: {
        core: CORE_REQUIREMENTS_MAP[major.major] || [],
        electives: [`${major.major} Electives`],
        capstone: [`${major.major} Capstone`]
      },
      apCredits: {
        accepted: AP_CREDITS_MAP[major.major] || [],
        maxCredits: 16
      }
    }));

    // Validate data
    const { validMajors, errors } = validateMajors(enrichedMajors);

    if (errors.length > 0) {
      console.warn('Validation errors found:', errors);
    }

    // Save raw data
    const rawDataPath = path.join(process.cwd(), 'data', 'raw', 'raw-majors.json');
    fs.mkdirSync(path.dirname(rawDataPath), { recursive: true });
    fs.writeFileSync(rawDataPath, JSON.stringify(scrapingResult.data, null, 2));

    // Save normalized data
    const majorData = {
      lastUpdated: new Date().toISOString(),
      majors: validMajors
    };

    const outputPath = path.join(process.cwd(), 'data', 'majors.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(majorData, null, 2));

    logProgress(`Successfully processed ${validMajors.length} majors`);
    logProgress(`Data saved to ${outputPath}`);

    if (errors.length > 0) {
      logProgress(`${errors.length} validation errors encountered`, errors);
    }

  } catch (error) {
    console.error('Error processing majors data:', error);
    throw error;
  }
}

// Export for use in npm scripts
if (require.main === module) {
  processMajorsData()
    .then(() => {
      console.log('Majors scraping completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Majors scraping failed:', error);
      process.exit(1);
    });
}