// Data normalization utilities for UVA course and major data
import { Course, Major, RawCourse, RawMajor, NormalizationConfig } from '../types';
import {
  cleanText,
  stripHtml,
  standardizeCourseId,
  parsePrerequisites,
  parseCredits,
  parseSemesters,
  getCourseLevel,
  mapDepartmentToSchool
} from './scraper-utils';

export const defaultNormalizationConfig: NormalizationConfig = {
  trimWhitespace: true,
  removeHtmlTags: true,
  standardizeCourseIds: true,
  validateCredits: true,
  parsePrerequisites: true
};

// Normalize raw course data to standard Course format
export function normalizeCourse(
  rawCourse: RawCourse,
  config: NormalizationConfig = defaultNormalizationConfig
): Course | null {
  try {
    // Extract and clean basic fields
    let id = rawCourse.id || '';
    let title = rawCourse.title || '';
    let description = rawCourse.description || '';

    if (config.trimWhitespace) {
      id = cleanText(id);
      title = cleanText(title);
      description = cleanText(description);
    }

    if (config.removeHtmlTags) {
      title = stripHtml(title);
      description = stripHtml(description);
    }

    if (config.standardizeCourseIds && id) {
      id = standardizeCourseId(id);
    }

    // Validate required fields
    if (!id || !title) {
      console.warn('Skipping course with missing required fields:', { id, title });
      return null;
    }

    // Parse credits
    let credits = 3; // Default
    if (rawCourse.credits) {
      if (typeof rawCourse.credits === 'number') {
        credits = rawCourse.credits;
      } else if (config.validateCredits) {
        credits = parseCredits(rawCourse.credits.toString());
      }
    }

    // Parse prerequisites
    let prereqs: string[] = [];
    if (rawCourse.prereqs) {
      if (Array.isArray(rawCourse.prereqs)) {
        prereqs = rawCourse.prereqs
          .map(p => config.standardizeCourseIds ? standardizeCourseId(p) : p)
          .filter(p => p.trim() !== '');
      } else if (config.parsePrerequisites) {
        prereqs = parsePrerequisites(rawCourse.prereqs.toString());
      }
    }

    // Parse semesters offered
    let semestersOffered: string[] = ['Fall', 'Spring']; // Default
    if (rawCourse.semestersOffered) {
      if (Array.isArray(rawCourse.semestersOffered)) {
        semestersOffered = rawCourse.semestersOffered.filter(s => s.trim() !== '');
      } else {
        semestersOffered = parseSemesters(rawCourse.semestersOffered.toString());
      }
    }

    // Parse fulfills requirements
    let fulfills: string[] = [];
    if (rawCourse.fulfills) {
      if (Array.isArray(rawCourse.fulfills)) {
        fulfills = rawCourse.fulfills.filter(f => f.trim() !== '');
      } else {
        fulfills = rawCourse.fulfills.toString()
          .split(/[,;]/)
          .map(f => cleanText(f))
          .filter(f => f !== '');
      }
    }

    // Extract department from course ID
    let department = rawCourse.department || '';
    if (!department && id) {
      const match = id.match(/^([A-Z]+)/);
      department = match ? match[1] : '';
    }

    // Determine school from department
    let school = rawCourse.school || '';
    if (!school && department) {
      school = mapDepartmentToSchool(department);
    }

    // Calculate course level
    let level = 1000;
    if (rawCourse.level) {
      if (typeof rawCourse.level === 'number') {
        level = rawCourse.level;
      } else {
        level = getCourseLevel(rawCourse.level.toString());
      }
    } else if (id) {
      level = getCourseLevel(id);
    }

    return {
      id,
      title,
      description,
      credits,
      prereqs,
      semestersOffered,
      fulfills,
      department: department.toUpperCase(),
      level,
      school
    };

  } catch (error) {
    console.error('Error normalizing course:', error, rawCourse);
    return null;
  }
}

// Normalize raw major data to standard Major format
export function normalizeMajor(
  rawMajor: RawMajor,
  config: NormalizationConfig = defaultNormalizationConfig
): Major | null {
  try {
    // Extract and clean basic fields
    let majorName = rawMajor.name || '';
    let degree = rawMajor.degree || 'B.A.';
    let school = rawMajor.school || '';

    if (config.trimWhitespace) {
      majorName = cleanText(majorName);
      degree = cleanText(degree);
      school = cleanText(school);
    }

    if (config.removeHtmlTags) {
      majorName = stripHtml(majorName);
      school = stripHtml(school);
    }

    // Validate required fields
    if (!majorName) {
      console.warn('Skipping major with missing name:', rawMajor);
      return null;
    }

    // Parse focus areas
    let focusAreas: string[] = [];
    if (rawMajor.focusAreas) {
      if (Array.isArray(rawMajor.focusAreas)) {
        focusAreas = rawMajor.focusAreas.filter(f => f.trim() !== '');
      } else {
        focusAreas = rawMajor.focusAreas.toString()
          .split(/[,;]/)
          .map(f => cleanText(f))
          .filter(f => f !== '');
      }
    }

    // Normalize degree format
    degree = normalizeDegreeType(degree);

    // Set default school if not provided
    if (!school) {
      school = inferSchoolFromMajor(majorName);
    }

    // Default values for required fields
    const currentYear = new Date().getFullYear();
    const entryYear = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];

    return {
      major: majorName,
      degree,
      school,
      entryYear,
      totalCredits: getDefaultCreditsForDegree(degree),
      requirements: {
        core: [], // Will be populated by detailed scraping
        electives: [],
        capstone: []
      },
      focusAreas,
      apCredits: {
        accepted: [], // Will be populated by detailed scraping
        maxCredits: 16 // Standard UVA limit
      }
    };

  } catch (error) {
    console.error('Error normalizing major:', error, rawMajor);
    return null;
  }
}

// Normalize degree type to standard format
function normalizeDegreeType(degree: string): string {
  const degreeMap: Record<string, string> = {
    'bachelor of arts': 'B.A.',
    'bachelor of science': 'B.S.',
    'bachelor of science in education': 'B.S.Ed.',
    'bachelor of fine arts': 'B.F.A.',
    'bachelor of architecture': 'B.Arch.',
    'bachelor of science in nursing': 'B.S.N.',
    'ba': 'B.A.',
    'bs': 'B.S.',
    'bsed': 'B.S.Ed.',
    'bfa': 'B.F.A.',
    'barch': 'B.Arch.',
    'bsn': 'B.S.N.'
  };

  const normalized = degreeMap[degree.toLowerCase()];
  return normalized || 'B.A.'; // Default to B.A.
}

// Infer school from major name
function inferSchoolFromMajor(majorName: string): string {
  const majorSchoolMap: Record<string, string> = {
    'computer science': 'School of Engineering and Applied Science',
    'electrical engineering': 'School of Engineering and Applied Science',
    'mechanical engineering': 'School of Engineering and Applied Science',
    'civil engineering': 'School of Engineering and Applied Science',
    'biomedical engineering': 'School of Engineering and Applied Science',
    'chemical engineering': 'School of Engineering and Applied Science',
    'systems engineering': 'School of Engineering and Applied Science',
    'aerospace engineering': 'School of Engineering and Applied Science',

    'commerce': 'McIntire School of Commerce',
    'business': 'McIntire School of Commerce',

    'architecture': 'School of Architecture',
    'landscape architecture': 'School of Architecture',

    'nursing': 'School of Nursing',

    'education': 'School of Education and Human Development',
    'kinesiology': 'School of Education and Human Development',

    'public policy': 'Frank Batten School of Leadership and Public Policy',
    'leadership': 'Frank Batten School of Leadership and Public Policy',

    'data science': 'School of Data Science'
  };

  const lowerName = majorName.toLowerCase();
  for (const [key, school] of Object.entries(majorSchoolMap)) {
    if (lowerName.includes(key)) {
      return school;
    }
  }

  return 'College of Arts & Sciences'; // Default
}

// Get default credit requirements for degree type
function getDefaultCreditsForDegree(degree: string): number {
  const creditMap: Record<string, number> = {
    'B.A.': 120,
    'B.S.': 120,
    'B.S.Ed.': 120,
    'B.F.A.': 120,
    'B.Arch.': 160,
    'B.S.N.': 120
  };

  return creditMap[degree] || 120;
}

// Normalize array of courses
export function normalizeCourses(
  rawCourses: RawCourse[],
  config: NormalizationConfig = defaultNormalizationConfig
): Course[] {
  const normalizedCourses: Course[] = [];

  rawCourses.forEach((rawCourse, index) => {
    try {
      const normalized = normalizeCourse(rawCourse, config);
      if (normalized) {
        normalizedCourses.push(normalized);
      }
    } catch (error) {
      console.error(`Error normalizing course at index ${index}:`, error);
    }
  });

  return normalizedCourses;
}

// Normalize array of majors
export function normalizeMajors(
  rawMajors: RawMajor[],
  config: NormalizationConfig = defaultNormalizationConfig
): Major[] {
  const normalizedMajors: Major[] = [];

  rawMajors.forEach((rawMajor, index) => {
    try {
      const normalized = normalizeMajor(rawMajor, config);
      if (normalized) {
        normalizedMajors.push(normalized);
      }
    } catch (error) {
      console.error(`Error normalizing major at index ${index}:`, error);
    }
  });

  return normalizedMajors;
}

// Remove duplicates from normalized data
export function deduplicateCourses(courses: Course[]): Course[] {
  const seen = new Set<string>();
  return courses.filter(course => {
    if (seen.has(course.id)) {
      console.warn(`Duplicate course found: ${course.id}`);
      return false;
    }
    seen.add(course.id);
    return true;
  });
}

export function deduplicateMajors(majors: Major[]): Major[] {
  const seen = new Set<string>();
  return majors.filter(major => {
    const key = `${major.major}-${major.degree}-${major.school}`;
    if (seen.has(key)) {
      console.warn(`Duplicate major found: ${key}`);
      return false;
    }
    seen.add(key);
    return true;
  });
}