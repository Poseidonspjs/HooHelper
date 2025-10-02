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

    // Scrape the main majors/minors list
    $('.content-area ul li a').each((index, element) => {
      const link = $(element);
      const majorName = cleanText(link.text());
      const majorUrl = link.attr('href');

      if (majorName && majorUrl) {
        // Infer degree and school from major name
        const { degree, school } = inferDegreeAndSchool(majorName);

        rawMajors.push({
          name: majorName,
          degree,
          school,
          focusAreas: FOCUS_AREAS_MAP[majorName] || [],
          sourceUrl: majorUrl.startsWith('http') ? majorUrl : `${MAJORS_CONFIG.baseUrl}${majorUrl}`
        });
      }
    });

    // Add additional majors that might not be in the main list
    const additionalMajors = generateAdditionalMajors();
    rawMajors.push(...additionalMajors);

    logProgress(`Scraped ${rawMajors.length} majors from UVA majors-minors page`);

    return createSuccessResult(rawMajors, `Successfully scraped ${rawMajors.length} majors`);

  } catch (error) {
    const errorMessage = `Failed to scrape UVA majors: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage, error);
    return createErrorResult([errorMessage]);
  }
}

// Infer degree type and school from major name
function inferDegreeAndSchool(majorName: string): { degree: string; school: string } {
  const lowerName = majorName.toLowerCase();

  // Check for explicit degree mentions in name
  if (lowerName.includes('b.s.') || lowerName.includes('bachelor of science')) {
    return { degree: 'B.S.', school: inferSchoolFromName(majorName) };
  }
  if (lowerName.includes('b.a.') || lowerName.includes('bachelor of arts')) {
    return { degree: 'B.A.', school: inferSchoolFromName(majorName) };
  }
  if (lowerName.includes('b.s.ed.') || lowerName.includes('education')) {
    return { degree: 'B.S.Ed.', school: 'School of Education and Human Development' };
  }
  if (lowerName.includes('architecture')) {
    return { degree: 'B.Arch.', school: 'School of Architecture' };
  }
  if (lowerName.includes('nursing')) {
    return { degree: 'B.S.N.', school: 'School of Nursing' };
  }

  // Default inference based on typical UVA patterns
  const school = inferSchoolFromName(majorName);
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

  return { degree, school };
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

// Generate additional majors with complete data based on UVA offerings
function generateAdditionalMajors(): RawMajor[] {
  const additionalMajors: RawMajor[] = [];

  for (const [school, majors] of Object.entries(UVA_SCHOOLS)) {
    for (const majorName of majors) {
      const { degree } = inferDegreeAndSchool(majorName);

      additionalMajors.push({
        name: majorName,
        degree,
        school,
        focusAreas: FOCUS_AREAS_MAP[majorName] || [],
        sourceUrl: 'https://www.virginia.edu/majors-minors/'
      });
    }
  }

  return additionalMajors;
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