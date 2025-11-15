// Data validation utilities for UVA course and major data
import { Course, Major, TestCredit, ValidationError } from '../types';

// Validate course data
export function validateCourse(course: any): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Required fields
  if (!course.id || typeof course.id !== 'string' || course.id.trim() === '') {
    errors.push({ field: 'id', message: 'Course ID is required and must be a non-empty string', value: course.id });
  }

  if (!course.title || typeof course.title !== 'string' || course.title.trim() === '') {
    errors.push({ field: 'title', message: 'Course title is required and must be a non-empty string', value: course.title });
  }

  if (!course.description || typeof course.description !== 'string') {
    errors.push({ field: 'description', message: 'Course description is required and must be a string', value: course.description });
  }

  if (typeof course.credits !== 'number' || course.credits < 0 || course.credits > 6) {
    errors.push({ field: 'credits', message: 'Credits must be a number between 0 and 6', value: course.credits });
  }

  if (!course.department || typeof course.department !== 'string' || course.department.trim() === '') {
    errors.push({ field: 'department', message: 'Department is required and must be a non-empty string', value: course.department });
  }

  if (!course.school || typeof course.school !== 'string' || course.school.trim() === '') {
    errors.push({ field: 'school', message: 'School is required and must be a non-empty string', value: course.school });
  }

  if (typeof course.level !== 'number' || course.level < 1000 || course.level > 9000) {
    errors.push({ field: 'level', message: 'Level must be a number between 1000 and 9000', value: course.level });
  }

  // Array fields
  if (!Array.isArray(course.prereqs)) {
    errors.push({ field: 'prereqs', message: 'Prerequisites must be an array', value: course.prereqs });
  }

  if (!Array.isArray(course.semestersOffered)) {
    errors.push({ field: 'semestersOffered', message: 'Semesters offered must be an array', value: course.semestersOffered });
  }

  if (!Array.isArray(course.fulfills)) {
    errors.push({ field: 'fulfills', message: 'Fulfills requirements must be an array', value: course.fulfills });
  }

  // Validate course ID format (e.g., "CS 1110")
  if (course.id && typeof course.id === 'string') {
    const courseIdPattern = /^[A-Z]{2,4}\s\d{3,4}[A-Z]?$/;
    if (!courseIdPattern.test(course.id)) {
      errors.push({ field: 'id', message: 'Course ID must follow format "DEPT ####" (e.g., "CS 1110")', value: course.id });
    }
  }

  // Validate semester values
  if (Array.isArray(course.semestersOffered)) {
    const validSemesters = ['Fall', 'Spring', 'Summer', 'Winter'];
    const invalidSemesters = course.semestersOffered.filter((sem: any) => !validSemesters.includes(sem));
    if (invalidSemesters.length > 0) {
      errors.push({ field: 'semestersOffered', message: 'Invalid semester values', value: invalidSemesters });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate major data
export function validateMajor(major: any): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Required fields
  if (!major.major || typeof major.major !== 'string' || major.major.trim() === '') {
    errors.push({ field: 'major', message: 'Major name is required and must be a non-empty string', value: major.major });
  }

  if (!major.degree || typeof major.degree !== 'string' || major.degree.trim() === '') {
    errors.push({ field: 'degree', message: 'Degree type is required and must be a non-empty string', value: major.degree });
  }

  if (!major.school || typeof major.school !== 'string' || major.school.trim() === '') {
    errors.push({ field: 'school', message: 'School is required and must be a non-empty string', value: major.school });
  }

  if (typeof major.totalCredits !== 'number' || major.totalCredits < 90 || major.totalCredits > 150) {
    errors.push({ field: 'totalCredits', message: 'Total credits must be a number between 90 and 150', value: major.totalCredits });
  }

  // Array fields
  if (!Array.isArray(major.entryYear)) {
    errors.push({ field: 'entryYear', message: 'Entry years must be an array', value: major.entryYear });
  }

  if (!Array.isArray(major.focusAreas)) {
    errors.push({ field: 'focusAreas', message: 'Focus areas must be an array', value: major.focusAreas });
  }

  // Requirements object
  if (!major.requirements || typeof major.requirements !== 'object') {
    errors.push({ field: 'requirements', message: 'Requirements must be an object', value: major.requirements });
  } else {
    if (!Array.isArray(major.requirements.core)) {
      errors.push({ field: 'requirements.core', message: 'Core requirements must be an array', value: major.requirements.core });
    }
    if (!Array.isArray(major.requirements.electives)) {
      errors.push({ field: 'requirements.electives', message: 'Elective requirements must be an array', value: major.requirements.electives });
    }
    if (!Array.isArray(major.requirements.capstone)) {
      errors.push({ field: 'requirements.capstone', message: 'Capstone requirements must be an array', value: major.requirements.capstone });
    }
  }

  // AP Credits object
  if (!major.apCredits || typeof major.apCredits !== 'object') {
    errors.push({ field: 'apCredits', message: 'AP credits must be an object', value: major.apCredits });
  } else {
    if (!Array.isArray(major.apCredits.accepted)) {
      errors.push({ field: 'apCredits.accepted', message: 'Accepted AP credits must be an array', value: major.apCredits.accepted });
    }
    if (typeof major.apCredits.maxCredits !== 'number' || major.apCredits.maxCredits < 0 || major.apCredits.maxCredits > 30) {
      errors.push({ field: 'apCredits.maxCredits', message: 'Max AP credits must be a number between 0 and 30', value: major.apCredits.maxCredits });
    }
  }

  // Validate degree format
  if (major.degree && typeof major.degree === 'string') {
    const validDegrees = ['B.A.', 'B.S.', 'B.S.Ed.', 'B.F.A.', 'B.Arch.', 'B.S.N.'];
    if (!validDegrees.includes(major.degree)) {
      errors.push({ field: 'degree', message: 'Invalid degree type', value: major.degree });
    }
  }

  // Validate entry years
  if (Array.isArray(major.entryYear)) {
    const currentYear = new Date().getFullYear();
    const invalidYears = major.entryYear.filter((year: any) =>
      typeof year !== 'number' || year < currentYear - 1 || year > currentYear + 5
    );
    if (invalidYears.length > 0) {
      errors.push({ field: 'entryYear', message: 'Invalid entry years', value: invalidYears });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate array of courses
export function validateCourses(courses: any[]): { validCourses: Course[]; errors: ValidationError[] } {
  const validCourses: Course[] = [];
  const allErrors: ValidationError[] = [];

  courses.forEach((course, index) => {
    const { isValid, errors } = validateCourse(course);
    if (isValid) {
      validCourses.push(course as Course);
    } else {
      errors.forEach(error => {
        allErrors.push({
          ...error,
          field: `course[${index}].${error.field}`,
          message: `Course ${index}: ${error.message}`
        });
      });
    }
  });

  return { validCourses, errors: allErrors };
}

// Validate array of majors
export function validateMajors(majors: any[]): { validMajors: Major[]; errors: ValidationError[] } {
  const validMajors: Major[] = [];
  const allErrors: ValidationError[] = [];

  majors.forEach((major, index) => {
    const { isValid, errors } = validateMajor(major);
    if (isValid) {
      validMajors.push(major as Major);
    } else {
      errors.forEach(error => {
        allErrors.push({
          ...error,
          field: `major[${index}].${error.field}`,
          message: `Major ${index}: ${error.message}`
        });
      });
    }
  });

  return { validMajors, errors: allErrors };
}

// Check for duplicate courses
export function findDuplicateCourses(courses: Course[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  courses.forEach(course => {
    if (seen.has(course.id)) {
      duplicates.add(course.id);
    } else {
      seen.add(course.id);
    }
  });

  return Array.from(duplicates);
}

// Check for duplicate majors
export function findDuplicateMajors(majors: Major[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  majors.forEach(major => {
    const key = `${major.major}-${major.degree}-${major.school}`;
    if (seen.has(key)) {
      duplicates.add(key);
    } else {
      seen.add(key);
    }
  });

  return Array.from(duplicates);
}

// Validate cross-references between courses and majors
export function validateCrossReferences(courses: Course[], majors: Major[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const courseIds = new Set(courses.map(c => c.id));

  majors.forEach((major, majorIndex) => {
    // Check if core requirement courses exist
    major.requirements.core.forEach((courseId, courseIndex) => {
      if (!courseIds.has(courseId)) {
        errors.push({
          field: `major[${majorIndex}].requirements.core[${courseIndex}]`,
          message: `Referenced course "${courseId}" not found in course data`,
          value: courseId
        });
      }
    });

    // Check prerequisites in courses
    courses.forEach((course, courseIndex) => {
      course.prereqs.forEach((prereqId, prereqIndex) => {
        if (!courseIds.has(prereqId)) {
          errors.push({
            field: `course[${courseIndex}].prereqs[${prereqIndex}]`,
            message: `Prerequisite course "${prereqId}" not found in course data`,
            value: prereqId
          });
        }
      });
    });
  });

  return errors;
}

// Validate test credit data
export function validateTestCredit(testCredit: any): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Required fields
  if (!testCredit.program || typeof testCredit.program !== 'string' || testCredit.program.trim() === '') {
    errors.push({ field: 'program', message: 'Program is required and must be a non-empty string', value: testCredit.program });
  }

  if (!testCredit.exam || typeof testCredit.exam !== 'string' || testCredit.exam.trim() === '') {
    errors.push({ field: 'exam', message: 'Exam name is required and must be a non-empty string', value: testCredit.exam });
  }

  // Different programs use different score scales
  // AP/IB: 1-10, Cambridge: 1-7 (A*=7), CLEP: 20-80, SAT II: 200-800
  const maxScore = testCredit.program === 'CLEP' ? 80 : (testCredit.program === 'SAT II' ? 800 : 10);
  if (typeof testCredit.min_score !== 'number' || testCredit.min_score < 1 || testCredit.min_score > maxScore) {
    errors.push({ field: 'min_score', message: `Minimum score must be a number between 1 and ${maxScore}`, value: testCredit.min_score });
  }

  if (typeof testCredit.credits_awarded !== 'number' || testCredit.credits_awarded < 0 || testCredit.credits_awarded > 12) {
    errors.push({ field: 'credits_awarded', message: 'Credits awarded must be a number between 0 and 12', value: testCredit.credits_awarded });
  }

  if (!testCredit.department || typeof testCredit.department !== 'string' || testCredit.department.trim() === '') {
    errors.push({ field: 'department', message: 'Department is required and must be a non-empty string', value: testCredit.department });
  }

  // Array fields
  if (!Array.isArray(testCredit.uva_equivalent)) {
    errors.push({ field: 'uva_equivalent', message: 'UVA equivalent courses must be an array', value: testCredit.uva_equivalent });
  } else {
    // Validate course ID format in UVA equivalents
    const courseIdPattern = /^[A-Z]{2,4}\s\d{3,4}[A-Z]?$/;
    const invalidCourseIds = testCredit.uva_equivalent.filter((courseId: any) => {
      return typeof courseId !== 'string' || !courseIdPattern.test(courseId);
    });
    if (invalidCourseIds.length > 0) {
      errors.push({ field: 'uva_equivalent', message: 'Invalid course ID format in UVA equivalents', value: invalidCourseIds });
    }
  }

  // Optional notes field
  if (testCredit.notes && typeof testCredit.notes !== 'string') {
    errors.push({ field: 'notes', message: 'Notes must be a string if provided', value: testCredit.notes });
  }

  // Validate program values
  const validPrograms = ['AP', 'IB', 'Cambridge', 'AICE', 'CLEP', 'French Baccalaureate', 'German Abitur', 'Swiss Federal Maturity', 'A-Level', 'SAT II'];
  if (testCredit.program && typeof testCredit.program === 'string') {
    if (!validPrograms.includes(testCredit.program)) {
      errors.push({ field: 'program', message: 'Invalid program type', value: testCredit.program });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate array of test credits
export function validateTestCredits(testCredits: any[]): { validTestCredits: TestCredit[]; errors: ValidationError[] } {
  const validTestCredits: TestCredit[] = [];
  const allErrors: ValidationError[] = [];

  testCredits.forEach((testCredit, index) => {
    const { isValid, errors } = validateTestCredit(testCredit);
    if (isValid) {
      validTestCredits.push(testCredit as TestCredit);
    } else {
      errors.forEach(error => {
        allErrors.push({
          ...error,
          field: `testCredit[${index}].${error.field}`,
          message: `Test Credit ${index}: ${error.message}`
        });
      });
    }
  });

  return { validTestCredits, errors: allErrors };
}

// Check for duplicate test credits
export function findDuplicateTestCredits(testCredits: TestCredit[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  testCredits.forEach(testCredit => {
    const key = `${testCredit.program}-${testCredit.exam}-${testCredit.min_score}`;
    if (seen.has(key)) {
      duplicates.add(key);
    } else {
      seen.add(key);
    }
  });

  return Array.from(duplicates);
}