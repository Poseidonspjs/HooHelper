// UVA Test Credits Scraper
// Scrapes test credit transfer data from UVA Academic Catalog
// Supports AP, IB, Cambridge, CLEP, and other standardized exam programs

import { RawTestCredit, ScrapingResult, ScraperConfig } from './types';
import {
  fetchWithRetry,
  parseHtml,
  cleanText,
  createSuccessResult,
  createErrorResult,
  logProgress,
  defaultScraperConfig,
  standardizeCourseId
} from './utils/scraper-utils';
import { normalizeTestCredits, deduplicateTestCredits } from './utils/normalizer';
import { validateTestCredits } from './utils/data-validator';
import * as fs from 'fs';
import * as path from 'path';

const CREDITS_CONFIG: ScraperConfig = {
  ...defaultScraperConfig,
  baseUrl: 'https://records.ureg.virginia.edu',
  rateLimit: 2000, // 2 second delay between requests
  retryAttempts: 3,
  timeout: 45000
};

// Main URL for test credit transfer data
const TEST_CREDITS_URL = 'https://records.ureg.virginia.edu/content.php?catoid=61&navoid=5298#Advanced_Placement_Program';

// Sample test credits data (representative of UVA's actual credit transfer policies)
function getSampleTestCredits(): RawTestCredit[] {
  return [
    // AP Credits
    { program: 'AP', exam: 'Calculus AB', min_score: 4, uva_equivalent: ['MATH 1310'], credits_awarded: 4, department: 'MATH' },
    { program: 'AP', exam: 'Calculus BC', min_score: 4, uva_equivalent: ['MATH 1310', 'MATH 1320'], credits_awarded: 8, department: 'MATH' },
    { program: 'AP', exam: 'Biology', min_score: 4, uva_equivalent: ['BIOL 1000T'], credits_awarded: 6, department: 'BIOL' },
    { program: 'AP', exam: 'Biology', min_score: 5, uva_equivalent: ['BIOL 2100', 'BIOL 2200'], credits_awarded: 8, department: 'BIOL' },
    { program: 'AP', exam: 'Chemistry', min_score: 4, uva_equivalent: ['CHEM 1410'], credits_awarded: 4, department: 'CHEM' },
    { program: 'AP', exam: 'Chemistry', min_score: 5, uva_equivalent: ['CHEM 1410', 'CHEM 1420'], credits_awarded: 8, department: 'CHEM' },
    { program: 'AP', exam: 'Computer Science A', min_score: 4, uva_equivalent: ['CS 1110'], credits_awarded: 3, department: 'CS' },
    { program: 'AP', exam: 'English Language', min_score: 4, uva_equivalent: ['ENGL 1000T'], credits_awarded: 3, department: 'ENGL' },
    { program: 'AP', exam: 'English Literature', min_score: 4, uva_equivalent: ['ENGL 1000T'], credits_awarded: 3, department: 'ENGL' },
    { program: 'AP', exam: 'Physics C: Mechanics', min_score: 4, uva_equivalent: ['PHYS 1425'], credits_awarded: 3, department: 'PHYS' },
    { program: 'AP', exam: 'Physics C: E&M', min_score: 4, uva_equivalent: ['PHYS 1429'], credits_awarded: 3, department: 'PHYS' },
    { program: 'AP', exam: 'Statistics', min_score: 4, uva_equivalent: ['STAT 1100'], credits_awarded: 3, department: 'STAT' },
    { program: 'AP', exam: 'US History', min_score: 4, uva_equivalent: ['HIST 1000T'], credits_awarded: 3, department: 'HIST' },
    { program: 'AP', exam: 'World History', min_score: 4, uva_equivalent: ['HIST 1000T'], credits_awarded: 3, department: 'HIST' },
    { program: 'AP', exam: 'Psychology', min_score: 4, uva_equivalent: ['PSYC 1010'], credits_awarded: 3, department: 'PSYC' },
    { program: 'AP', exam: 'Macroeconomics', min_score: 4, uva_equivalent: ['ECON 2020'], credits_awarded: 3, department: 'ECON' },
    { program: 'AP', exam: 'Microeconomics', min_score: 4, uva_equivalent: ['ECON 2010'], credits_awarded: 3, department: 'ECON' },

    // IB Credits
    { program: 'IB', exam: 'Mathematics HL', min_score: 6, uva_equivalent: ['MATH 1310'], credits_awarded: 4, department: 'MATH' },
    { program: 'IB', exam: 'Mathematics HL', min_score: 7, uva_equivalent: ['MATH 1310', 'MATH 1320'], credits_awarded: 8, department: 'MATH' },
    { program: 'IB', exam: 'Biology HL', min_score: 6, uva_equivalent: ['BIOL 2100'], credits_awarded: 4, department: 'BIOL' },
    { program: 'IB', exam: 'Chemistry HL', min_score: 6, uva_equivalent: ['CHEM 1410'], credits_awarded: 4, department: 'CHEM' },
    { program: 'IB', exam: 'Physics HL', min_score: 6, uva_equivalent: ['PHYS 1425'], credits_awarded: 3, department: 'PHYS' },
    { program: 'IB', exam: 'Computer Science HL', min_score: 6, uva_equivalent: ['CS 1110'], credits_awarded: 3, department: 'CS' },
    { program: 'IB', exam: 'English HL', min_score: 6, uva_equivalent: ['ENGL 1000T'], credits_awarded: 3, department: 'ENGL' },
    { program: 'IB', exam: 'History HL', min_score: 6, uva_equivalent: ['HIST 1000T'], credits_awarded: 3, department: 'HIST' },
    { program: 'IB', exam: 'Economics HL', min_score: 6, uva_equivalent: ['ECON 1000T'], credits_awarded: 3, department: 'ECON' },

    // Cambridge/AICE Credits
    { program: 'Cambridge', exam: 'Mathematics A-Level', min_score: 4, uva_equivalent: ['MATH 1310'], credits_awarded: 4, department: 'MATH', notes: 'Grade: C' },
    { program: 'Cambridge', exam: 'Biology A-Level', min_score: 4, uva_equivalent: ['BIOL 1000T'], credits_awarded: 4, department: 'BIOL', notes: 'Grade: C' },
    { program: 'Cambridge', exam: 'Chemistry A-Level', min_score: 4, uva_equivalent: ['CHEM 1410'], credits_awarded: 4, department: 'CHEM', notes: 'Grade: C' },
    { program: 'Cambridge', exam: 'Physics A-Level', min_score: 4, uva_equivalent: ['PHYS 1425'], credits_awarded: 3, department: 'PHYS', notes: 'Grade: C' },

    // CLEP Credits
    { program: 'CLEP', exam: 'Calculus', min_score: 50, uva_equivalent: ['MATH 1310'], credits_awarded: 4, department: 'MATH' },
    { program: 'CLEP', exam: 'Biology', min_score: 50, uva_equivalent: ['BIOL 1000T'], credits_awarded: 3, department: 'BIOL' },
    { program: 'CLEP', exam: 'Chemistry', min_score: 50, uva_equivalent: ['CHEM 1410'], credits_awarded: 4, department: 'CHEM' },
    { program: 'CLEP', exam: 'English Composition', min_score: 50, uva_equivalent: ['ENGL 1000T'], credits_awarded: 3, department: 'ENGL' },
  ];
}

// Program section identifiers
const PROGRAM_SECTIONS = {
  AP: 'Advanced Placement',
  IB: 'International Baccalaureate',
  CAMBRIDGE: 'British System Advanced-Levels',
  AICE: 'Cambridge International Exams',
  CLEP: 'College Level Examination Program',
  FRENCH_BAC: 'French Baccalaureate',
  GERMAN_ABITUR: 'German Abitur',
  SWISS: 'Swiss Federal Maturity',
  SAT_II: 'SAT II Subject Test'
};

export async function scrapeTestCreditsFromUVA(): Promise<ScrapingResult<RawTestCredit>> {
  try {
    logProgress('Starting UVA test credits scraping from Academic Catalog');

    const rawCredits: RawTestCredit[] = [];
    const errors: string[] = [];

    // Fetch the main page
    const html = await fetchWithRetry(TEST_CREDITS_URL, CREDITS_CONFIG);
    const $ = parseHtml(html);

    logProgress('Parsing test credit sections...');

    // Parse Advanced Placement (AP) section
    try {
      logProgress('Parsing AP section...');
      const apCredits = parseAPSection($);
      rawCredits.push(...apCredits);
      logProgress(`✓ AP: Successfully parsed ${apCredits.length} credit entries`);
    } catch (error) {
      const errorMsg = `AP: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Error parsing AP section:', error);
      errors.push(errorMsg);
    }

    // Parse International Baccalaureate (IB) section
    try {
      logProgress('Parsing IB section...');
      const ibCredits = parseIBSection($);
      rawCredits.push(...ibCredits);
      logProgress(`✓ IB: Successfully parsed ${ibCredits.length} credit entries`);
    } catch (error) {
      const errorMsg = `IB: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Error parsing IB section:', error);
      errors.push(errorMsg);
    }

    // Parse Cambridge/AICE section
    try {
      logProgress('Parsing Cambridge/AICE section...');
      const cambridgeCredits = parseCambridgeSection($);
      rawCredits.push(...cambridgeCredits);
      logProgress(`✓ Cambridge/AICE: Successfully parsed ${cambridgeCredits.length} credit entries`);
    } catch (error) {
      const errorMsg = `Cambridge: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Error parsing Cambridge section:', error);
      errors.push(errorMsg);
    }

    // Parse CLEP section
    try {
      logProgress('Parsing CLEP section...');
      const clepCredits = parseCLEPSection($);
      rawCredits.push(...clepCredits);
      logProgress(`✓ CLEP: Successfully parsed ${clepCredits.length} credit entries`);
    } catch (error) {
      const errorMsg = `CLEP: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Error parsing CLEP section:', error);
      errors.push(errorMsg);
    }

    // Parse other international programs if available
    try {
      logProgress('Parsing other international programs...');
      const otherCredits = parseOtherPrograms($);
      rawCredits.push(...otherCredits);
      logProgress(`✓ Other Programs: Successfully parsed ${otherCredits.length} credit entries`);
    } catch (error) {
      const errorMsg = `Other Programs: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Error parsing other programs:', error);
      errors.push(errorMsg);
    }

    logProgress('\n=== Scraping Complete ===');
    logProgress(`Total credit entries parsed: ${rawCredits.length}`);
    logProgress(`Sections with errors: ${errors.length}`);

    if (rawCredits.length === 0) {
      return createErrorResult([
        'No test credits were parsed from any section',
        ...errors
      ]);
    }

    return createSuccessResult(
      rawCredits,
      `Successfully parsed ${rawCredits.length} test credit entries`
    );

  } catch (error) {
    const errorMessage = `Failed to scrape UVA test credits: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage, error);
    return createErrorResult([errorMessage]);
  }
}

// Parse AP (Advanced Placement) section
function parseAPSection($: cheerio.CheerioAPI): RawTestCredit[] {
  const credits: RawTestCredit[] = [];

  // Find AP heading by id or text content
  let apHeading = $('h3#Advanced_Placement_Program');
  if (!apHeading.length) {
    apHeading = $('h3').filter((_, el) => {
      const text = cleanText($(el).text());
      return text.includes('Advanced Placement');
    }).first();
  }

  if (!apHeading.length) {
    logProgress('⚠ AP heading not found');
    return credits;
  }

  // Find table by content (look for tables with AP exam names)
  let table = $('table').filter((_, el) => {
    const allText = $(el).text().toLowerCase();
    return (allText.includes('biology') || allText.includes('calculus') || allText.includes('chemistry')) &&
           allText.includes('score') && allText.includes('credit');
  }).filter((_, el) => {
    const $tbl = $(el);
    const apIdx = $('*').index(apHeading);
    const tblIdx = $('*').index($tbl);
    return tblIdx > apIdx;
  }).first();

  // Strategy 2: Get next sibling table after the heading's paragraph
  if (!table.length) {
    let current = apHeading.next();
    while (current.length && !current.is('table') && !current.is('h2, h3')) {
      if (current.is('p')) {
        const nextEl = current.next();
        if (nextEl.is('table')) {
          table = nextEl;
          break;
        }
      }
      current = current.next();
    }
  }

  // Strategy 3: Find first table after the heading (within reasonable distance)
  if (!table.length) {
    const allTables = $('table').toArray();
    const headingIndex = $('h3').index(apHeading);

    for (const tbl of allTables) {
      const $tbl = $(tbl);
      const headerText = $tbl.find('th').text();
      if (headerText.includes('Score') && headerText.includes('Credits')) {
        table = $tbl;
        break;
      }
    }
  }

  if (!table.length) {
    logProgress('⚠ AP table not found');
    return credits;
  }

  // Parse table rows (skip header row in thead)
  const rows = table.find('tbody tr').toArray();

  rows.forEach((row) => {
    const $row = $(row);
    const cells = $row.find('td').toArray();

    if (cells.length < 3) return; // Need at least 3 columns

    const examText = cleanText($(cells[0]).text());
    const scoreText = cleanText($(cells[1]).text());
    const creditsText = cleanText($(cells[2]).text());

    // Skip header rows and empty rows
    if (!examText || examText.toLowerCase().includes('examination') || examText.toLowerCase() === 'exam') return;

    // Parse score (may have multiple scores like "4 or 5")
    const scores = parseScores(scoreText);

    // Parse credits and course equivalents
    const creditInfo = parseCreditInfo(creditsText);

    // Create entries for each score
    scores.forEach(score => {
      if (creditInfo.length > 0) {
        creditInfo.forEach(info => {
          credits.push({
            program: 'AP',
            exam: examText,
            min_score: score,
            uva_equivalent: info.courses,
            credits_awarded: info.credits,
            department: info.department,
            notes: info.notes
          });
        });
      } else {
        // No specific course info, just credits
        credits.push({
          program: 'AP',
          exam: examText,
          min_score: score,
          uva_equivalent: [],
          credits_awarded: 0,
          department: '',
          notes: creditsText
        });
      }
    });
  });

  return credits;
}

// Parse IB (International Baccalaureate) section
function parseIBSection($: cheerio.CheerioAPI): RawTestCredit[] {
  const credits: RawTestCredit[] = [];

  // Find IB heading
  let ibHeading = $('h3').filter((_, el) => {
    const text = cleanText($(el).text());
    return text.includes('International Baccalaureate') || text.includes('IB Program');
  }).first();

  if (!ibHeading.length) {
    logProgress('⚠ IB heading not found');
    return credits;
  }

  // Find table using similar strategies as AP
  let table = $('table').filter((_, el) => {
    const headerText = $(el).find('th').text();
    return headerText.includes('Subject') || (headerText.includes('Score') && headerText.includes('Course'));
  }).filter((_, el) => {
    // Make sure it's after the IB heading
    const $tbl = $(el);
    const ibIndex = $('h3').index(ibHeading);
    const allH3s = $('h3').toArray();
    const tablePosition = $tbl.prevAll('h3').length;
    return tablePosition >= ibIndex;
  }).first();

  if (!table.length) {
    // Try getting next table after heading
    let current = ibHeading.next();
    while (current.length && !current.is('table') && !current.is('h2, h3')) {
      if (current.is('p')) {
        const nextEl = current.next();
        if (nextEl.is('table')) {
          table = nextEl;
          break;
        }
      }
      current = current.next();
    }
  }

  if (!table.length) {
    logProgress('⚠ IB table not found');
    return credits;
  }

  const rows = table.find('tbody tr').toArray();

  rows.forEach((row) => {
    const $row = $(row);
    const cells = $row.find('td').toArray();

    if (cells.length < 3) return;

    const examText = cleanText($(cells[0]).text());
    const scoreText = cleanText($(cells[1]).text());
    const creditsText = cleanText($(cells[2]).text());

    if (!examText) return;

    const scores = parseScores(scoreText);
    const creditInfo = parseCreditInfo(creditsText);

    scores.forEach(score => {
      if (creditInfo.length > 0) {
        creditInfo.forEach(info => {
          credits.push({
            program: 'IB',
            exam: examText,
            min_score: score,
            uva_equivalent: info.courses,
            credits_awarded: info.credits,
            department: info.department,
            notes: info.notes
          });
        });
      } else {
        credits.push({
          program: 'IB',
          exam: examText,
          min_score: score,
          uva_equivalent: [],
          credits_awarded: 0,
          department: '',
          notes: creditsText
        });
      }
    });
  });

  return credits;
}

// Parse Cambridge/AICE section
function parseCambridgeSection($: cheerio.CheerioAPI): RawTestCredit[] {
  const credits: RawTestCredit[] = [];

  // Find Cambridge heading
  const cambridgeHeading = $('h3').filter((_, el) => {
    const text = cleanText($(el).text());
    return text.includes('Cambridge') || text.includes('AICE') || text.includes('British System') || text.includes('Advanced-Level');
  }).first();

  if (!cambridgeHeading.length) {
    logProgress('⚠ Cambridge heading not found');
    return credits;
  }

  // Find table
  let table = cambridgeHeading.nextAll('table').first();

  if (!table.length) {
    // Try getting next table after heading
    let current = cambridgeHeading.next();
    while (current.length && !current.is('table') && !current.is('h2, h3')) {
      if (current.is('p, ul, ol')) {
        const nextEl = current.next();
        if (nextEl.is('table')) {
          table = nextEl;
          break;
        }
      }
      current = current.next();
    }
  }

  if (!table.length) {
    logProgress('⚠ Cambridge table not found');
    return credits;
  }

  const rows = table.find('tbody tr').toArray();

  rows.forEach((row) => {
    const $row = $(row);
    const cells = $row.find('td').toArray();

    if (cells.length < 3) return;

    const examText = cleanText($(cells[0]).text());
    const scoreText = cleanText($(cells[1]).text());
    const creditsText = cleanText($(cells[2]).text());

    if (!examText) return;

    const scores = parseCambridgeScores(scoreText);
    const creditInfo = parseCreditInfo(creditsText);

    scores.forEach(scoreInfo => {
      if (creditInfo.length > 0) {
        creditInfo.forEach(info => {
          credits.push({
            program: 'Cambridge',
            exam: examText,
            min_score: scoreInfo.numeric,
            uva_equivalent: info.courses,
            credits_awarded: info.credits,
            department: info.department,
            notes: `Grade: ${scoreInfo.letter}` + (info.notes ? ` - ${info.notes}` : '')
          });
        });
      } else {
        credits.push({
          program: 'Cambridge',
          exam: examText,
          min_score: scoreInfo.numeric,
          uva_equivalent: [],
          credits_awarded: 0,
          department: '',
          notes: `Grade: ${scoreInfo.letter} - ${creditsText}`
        });
      }
    });
  });

  return credits;
}

// Parse CLEP section
function parseCLEPSection($: cheerio.CheerioAPI): RawTestCredit[] {
  const credits: RawTestCredit[] = [];

  // Find CLEP heading
  const clepHeading = $('h3').filter((_, el) => {
    const text = cleanText($(el).text());
    return text.includes('CLEP') || text.includes('College Level Examination');
  }).first();

  if (!clepHeading.length) {
    logProgress('⚠ CLEP heading not found');
    return credits;
  }

  // Find table
  let table = clepHeading.nextAll('table').first();

  if (!table.length) {
    // Try getting next table after heading
    let current = clepHeading.next();
    while (current.length && !current.is('table') && !current.is('h2, h3')) {
      if (current.is('p, ul, ol')) {
        const nextEl = current.next();
        if (nextEl.is('table')) {
          table = nextEl;
          break;
        }
      }
      current = current.next();
    }
  }

  if (!table.length) {
    logProgress('⚠ CLEP table not found');
    return credits;
  }

  const rows = table.find('tbody tr').toArray();

  rows.forEach((row) => {
    const $row = $(row);
    const cells = $row.find('td').toArray();

    if (cells.length < 3) return;

    const examText = cleanText($(cells[0]).text());
    const scoreText = cleanText($(cells[1]).text());
    const creditsText = cleanText($(cells[2]).text());

    if (!examText) return;

    const scores = parseScores(scoreText);
    const creditInfo = parseCreditInfo(creditsText);

    scores.forEach(score => {
      if (creditInfo.length > 0) {
        creditInfo.forEach(info => {
          credits.push({
            program: 'CLEP',
            exam: examText,
            min_score: score,
            uva_equivalent: info.courses,
            credits_awarded: info.credits,
            department: info.department,
            notes: info.notes
          });
        });
      } else {
        credits.push({
          program: 'CLEP',
          exam: examText,
          min_score: score,
          uva_equivalent: [],
          credits_awarded: 0,
          department: '',
          notes: creditsText
        });
      }
    });
  });

  return credits;
}

// Parse other international programs (French Bac, German Abitur, etc.)
function parseOtherPrograms($: cheerio.CheerioAPI): RawTestCredit[] {
  const credits: RawTestCredit[] = [];

  // French Baccalaureate
  const frenchHeading = $('h3').filter((_, el) => {
    return cleanText($(el).text()).includes('French Baccalaureate');
  }).first();

  if (frenchHeading.length) {
    const table = frenchHeading.nextAll('table').first();
    if (table.length) {
      const frenchCredits = parseGenericTable($, table, 'French Baccalaureate');
      credits.push(...frenchCredits);
    }
  }

  // German Abitur
  const germanHeading = $('h3').filter((_, el) => {
    return cleanText($(el).text()).includes('German Abitur');
  }).first();

  if (germanHeading.length) {
    const table = germanHeading.nextAll('table').first();
    if (table.length) {
      const germanCredits = parseGenericTable($, table, 'German Abitur');
      credits.push(...germanCredits);
    }
  }

  // Swiss Federal Maturity
  const swissHeading = $('h3').filter((_, el) => {
    return cleanText($(el).text()).includes('Swiss Federal Maturity');
  }).first();

  if (swissHeading.length) {
    const table = swissHeading.nextAll('table').first();
    if (table.length) {
      const swissCredits = parseGenericTable($, table, 'Swiss Federal Maturity');
      credits.push(...swissCredits);
    }
  }

  return credits;
}

// Generic table parser for international programs
function parseGenericTable($: cheerio.CheerioAPI, table: cheerio.Cheerio, program: string): RawTestCredit[] {
  const credits: RawTestCredit[] = [];
  const rows = table.find('tbody tr').toArray();

  rows.forEach((row) => {
    const $row = $(row);
    const cells = $row.find('td').toArray();

    if (cells.length < 2) return;

    const examText = cleanText($(cells[0]).text());
    const creditsText = cleanText($(cells[cells.length - 1]).text());

    if (!examText) return;

    const creditInfo = parseCreditInfo(creditsText);

    if (creditInfo.length > 0) {
      creditInfo.forEach(info => {
        credits.push({
          program,
          exam: examText,
          min_score: 5, // Default passing score for international programs
          uva_equivalent: info.courses,
          credits_awarded: info.credits,
          department: info.department,
          notes: info.notes
        });
      });
    }
  });

  return credits;
}

// Parse score values from text (handles "4", "4 or 5", "4-5", etc.)
function parseScores(scoreText: string): number[] {
  const scores: number[] = [];

  // Match all numbers in the text
  const numberMatches = scoreText.match(/\d+/g);
  if (numberMatches) {
    numberMatches.forEach(match => {
      const score = parseInt(match);
      if (score >= 1 && score <= 10) {
        scores.push(score);
      }
    });
  }

  // If no scores found, default to 4 (common AP/IB threshold)
  if (scores.length === 0) {
    scores.push(4);
  }

  return scores;
}

// Parse Cambridge letter grades to numeric scores
function parseCambridgeScores(scoreText: string): Array<{letter: string; numeric: number}> {
  const scores: Array<{letter: string; numeric: number}> = [];

  // Cambridge uses A*, A, B, C, D, E grades
  // Convert to numeric: A*=7, A=6, B=5, C=4, D=3, E=2
  const gradeMap: Record<string, number> = {
    'A*': 7, 'A': 6, 'B': 5, 'C': 4, 'D': 3, 'E': 2
  };

  const lowerText = scoreText.toUpperCase();

  for (const [letter, numeric] of Object.entries(gradeMap)) {
    if (lowerText.includes(letter)) {
      scores.push({ letter, numeric });
    }
  }

  if (scores.length === 0) {
    scores.push({ letter: 'C', numeric: 4 });
  }

  return scores;
}

// Parse credit information from text (extracts courses and credit hours)
interface CreditInfo {
  courses: string[];
  credits: number;
  department: string;
  notes?: string;
}

function parseCreditInfo(text: string): CreditInfo[] {
  const results: CreditInfo[] = [];

  // Pattern to match course IDs: "MATH 1310" or "CHEM1410" or "BIOL 2100"
  // This will match all occurrences including those separated by "and", commas, etc.
  const coursePattern = /([A-Z]{2,4})\s*(\d{3,4}[A-Z]?)/gi;
  const courseMatches = text.match(coursePattern);

  if (!courseMatches || courseMatches.length === 0) {
    // No specific courses, try to extract just credit numbers
    const creditMatch = text.match(/(\d+)\s*credits?/i);
    if (creditMatch) {
      results.push({
        courses: [],
        credits: parseInt(creditMatch[1]),
        department: 'GENERAL',
        notes: text
      });
    }
    return results;
  }

  // Filter out "AND" which is not a department code (handles "CHEM 1410 and 1420")
  // Standardize remaining course IDs
  const courses = courseMatches
    .filter(c => !c.toUpperCase().startsWith('AND '))
    .map(c => standardizeCourseId(c));

  // Extract credit hours - look for explicit credit count
  const creditMatch = text.match(/(\d+)\s*credits?/i);
  const credits = creditMatch ? parseInt(creditMatch[1]) : courses.length * 3; // Default 3 credits per course

  // Extract department from first course
  const deptMatch = courses[0].match(/^([A-Z]+)/);
  const department = deptMatch ? deptMatch[1] : 'GENERAL';

  // Check for exemption or placement notes
  let notes: string | undefined;
  if (text.toLowerCase().includes('exemption') && !text.toLowerCase().includes('credit')) {
    notes = 'Exemption only (no credit)';
  } else if (text.toLowerCase().includes('placement')) {
    notes = 'Placement only';
  } else if (text.toLowerCase().includes('waive') || text.toLowerCase().includes('waiver')) {
    notes = 'Requirement waived';
  }

  results.push({
    courses,
    credits,
    department,
    notes
  });

  return results;
}

// Main function to scrape, normalize, and save test credits data
export async function processTestCreditsData(): Promise<void> {
  try {
    logProgress('Processing UVA test credits data');

    // Scrape raw data
    const scrapingResult = await scrapeTestCreditsFromUVA();

    if (!scrapingResult.success) {
      throw new Error(`Scraping failed: ${scrapingResult.errors.join(', ')}`);
    }

    // Normalize data
    const normalizedCredits = normalizeTestCredits(scrapingResult.data);
    const deduplicatedCredits = deduplicateTestCredits(normalizedCredits);

    // Validate data
    const { validTestCredits, errors } = validateTestCredits(deduplicatedCredits);

    if (errors.length > 0) {
      console.warn('Validation errors found:', errors);
    }

    // Save raw data
    const rawDataPath = path.join(process.cwd(), 'data', 'raw', 'raw-test-credits.json');
    fs.mkdirSync(path.dirname(rawDataPath), { recursive: true });
    fs.writeFileSync(rawDataPath, JSON.stringify(scrapingResult.data, null, 2));

    // Save normalized data
    const creditsData = {
      lastUpdated: new Date().toISOString(),
      credits: validTestCredits
    };

    const outputPath = path.join(process.cwd(), 'data', 'test-credits.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(creditsData, null, 2));

    logProgress(`Successfully processed ${validTestCredits.length} test credits`);
    logProgress(`Data saved to ${outputPath}`);

    if (errors.length > 0) {
      logProgress(`${errors.length} validation errors encountered`, errors);
    }

    // Print statistics by program
    const programStats = new Map<string, number>();
    validTestCredits.forEach(credit => {
      const count = programStats.get(credit.program) || 0;
      programStats.set(credit.program, count + 1);
    });

    logProgress('\n=== Program Statistics ===');
    programStats.forEach((count, program) => {
      logProgress(`${program}: ${count} credit entries`);
    });

  } catch (error) {
    console.error('Error processing test credits data:', error);
    throw error;
  }
}

// Export for use in npm scripts
if (require.main === module) {
  processTestCreditsData()
    .then(() => {
      console.log('Test credits scraping completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test credits scraping failed:', error);
      process.exit(1);
    });
}
