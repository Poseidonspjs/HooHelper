// Common utilities for web scraping UVA data sources
import * as cheerio from 'cheerio';
import { ScraperConfig, ScrapingResult } from '../types';

export const defaultScraperConfig: ScraperConfig = {
  baseUrl: '',
  rateLimit: 1000,     // 1 second between requests
  retryAttempts: 3,
  timeout: 30000       // 30 second timeout
};

// Delay function for rate limiting
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Fetch with retry logic and rate limiting
export async function fetchWithRetry(
  url: string,
  config: ScraperConfig = defaultScraperConfig
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      console.log(`[SCRAPER] Fetching ${url} (attempt ${attempt}/${config.retryAttempts})`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Rate limiting
      if (attempt < config.retryAttempts) {
        await delay(config.rateLimit);
      }

      return html;

    } catch (error) {
      lastError = error as Error;
      console.error(`[SCRAPER] Attempt ${attempt} failed for ${url}:`, error);

      if (attempt < config.retryAttempts) {
        const backoffDelay = config.rateLimit * Math.pow(2, attempt - 1);
        console.log(`[SCRAPER] Retrying in ${backoffDelay}ms...`);
        await delay(backoffDelay);
      }
    }
  }

  throw new Error(`Failed to fetch ${url} after ${config.retryAttempts} attempts. Last error: ${lastError?.message}`);
}

// Load and parse HTML with Cheerio
export function parseHtml(html: string): cheerio.CheerioAPI {
  return cheerio.load(html);
}

// Extract text content and clean whitespace
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')           // Replace multiple whitespace with single space
    .replace(/&nbsp;/g, ' ')        // Replace HTML non-breaking spaces
    .trim();                        // Remove leading/trailing whitespace
}

// Remove HTML tags from text
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

// Standardize course ID format (e.g., "CS1110" -> "CS 1110")
export function standardizeCourseId(courseId: string): string {
  const match = courseId.match(/^([A-Z]+)[\s-]*(\d+[A-Z]?)$/i);
  if (match) {
    return `${match[1].toUpperCase()} ${match[2]}`;
  }
  return courseId.toUpperCase().trim();
}

// Parse prerequisite strings into course ID arrays
export function parsePrerequisites(prereqText: string): string[] {
  if (!prereqText || prereqText.toLowerCase().includes('none')) {
    return [];
  }

  // Extract course patterns (e.g., "CS 1110", "MATH1310")
  const coursePattern = /([A-Z]{2,4})\s*[\-\s]*(\d{3,4}[A-Z]?)/gi;
  const matches = prereqText.match(coursePattern);

  if (!matches) {
    return [];
  }

  return matches
    .map(standardizeCourseId)
    .filter((id, index, array) => array.indexOf(id) === index); // Remove duplicates
}

// Extract numeric credits from various text formats
export function parseCredits(creditsText: string): number {
  if (!creditsText) return 0;

  const match = creditsText.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const credits = parseFloat(match[1]);
    return credits >= 1 && credits <= 6 ? credits : 3; // Default to 3 if outside normal range
  }

  return 3; // Default credits
}

// Parse semester offerings from text
export function parseSemesters(semesterText: string): string[] {
  if (!semesterText) return [];

  const semesters: string[] = [];
  const text = semesterText.toLowerCase();

  if (text.includes('fall')) semesters.push('Fall');
  if (text.includes('spring')) semesters.push('Spring');
  if (text.includes('summer')) semesters.push('Summer');
  if (text.includes('winter')) semesters.push('Winter');

  // If no specific semesters mentioned, assume Fall and Spring
  return semesters.length > 0 ? semesters : ['Fall', 'Spring'];
}

// Create a success result
export function createSuccessResult<T>(data: T[], message?: string): ScrapingResult<T> {
  return {
    success: true,
    data,
    errors: message ? [message] : [],
    timestamp: new Date().toISOString()
  };
}

// Create an error result
export function createErrorResult<T>(errors: string[]): ScrapingResult<T> {
  return {
    success: false,
    data: [],
    errors,
    timestamp: new Date().toISOString()
  };
}

// Extract course level from course number
export function getCourseLevel(courseId: string): number {
  const match = courseId.match(/(\d+)/);
  if (match) {
    const number = parseInt(match[1]);
    return Math.floor(number / 1000) * 1000;
  }
  return 1000; // Default to 1000 level
}

// Map department codes to full school names
export function mapDepartmentToSchool(department: string): string {
  const departmentSchoolMap: Record<string, string> = {
    'CS': 'School of Engineering and Applied Science',
    'ECE': 'School of Engineering and Applied Science',
    'MAE': 'School of Engineering and Applied Science',
    'CE': 'School of Engineering and Applied Science',
    'BME': 'School of Engineering and Applied Science',
    'CHE': 'School of Engineering and Applied Science',
    'MSE': 'School of Engineering and Applied Science',
    'STS': 'School of Engineering and Applied Science',
    'APMA': 'School of Engineering and Applied Science',

    'COMM': 'McIntire School of Commerce',

    'MATH': 'College of Arts & Sciences',
    'PHYS': 'College of Arts & Sciences',
    'CHEM': 'College of Arts & Sciences',
    'BIOL': 'College of Arts & Sciences',
    'PSYC': 'College of Arts & Sciences',
    'ECON': 'College of Arts & Sciences',
    'ENGL': 'College of Arts & Sciences',
    'HIST': 'College of Arts & Sciences',
    'POLI': 'College of Arts & Sciences',
    'PHIL': 'College of Arts & Sciences',
    'SPAN': 'College of Arts & Sciences',
    'FREN': 'College of Arts & Sciences',
    'GERM': 'College of Arts & Sciences',

    'NURS': 'School of Nursing',
    'ARCH': 'School of Architecture',
    'EDLF': 'School of Education and Human Development',
    'KINE': 'School of Education and Human Development',
    'PPOL': 'Frank Batten School of Leadership and Public Policy',
    'DS': 'School of Data Science',
    'SCPS': 'School of Continuing and Professional Studies'
  };

  return departmentSchoolMap[department.toUpperCase()] || 'College of Arts & Sciences';
}

// Validate URL format
export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

// Log scraping progress
export function logProgress(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}