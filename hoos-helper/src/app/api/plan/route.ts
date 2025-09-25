import { NextRequest, NextResponse } from 'next/server';

// TypeScript interfaces matching frontend FormData
interface PlanRequest {
  major: string;
  focusArea: string;
  entryYear: string;
  apCredits: string[];
  additionalDetails: string;
}

interface PlanResponse {
  success: boolean;
  plan?: {
    summary: string;
    semesters: SemesterPlan[];
    totalCredits: number;
    graduationYear: number;
  };
  message?: string;
  error?: string;
  details?: string;
}

interface SemesterPlan {
  semester: string;
  year: number;
  courses: CoursePlan[];
  totalCredits: number;
}

interface CoursePlan {
  code: string;
  name: string;
  credits: number;
  type: 'Major Required' | 'Focus Area' | 'General Education' | 'Elective';
  description: string;
}

// Input validation helper
function validatePlanRequest(data: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Type guard to ensure data is an object
  if (!data || typeof data !== 'object') {
    errors.push('Request data must be a valid object');
    return { isValid: false, errors };
  }

  const requestData = data as Record<string, unknown>;

  if (!requestData.major || typeof requestData.major !== 'string' || requestData.major.trim() === '') {
    errors.push('Major is required and must be a non-empty string');
  }

  if (!requestData.focusArea || typeof requestData.focusArea !== 'string' || requestData.focusArea.trim() === '') {
    errors.push('Focus area is required and must be a non-empty string');
  }

  if (!requestData.entryYear || typeof requestData.entryYear !== 'string' || requestData.entryYear.trim() === '') {
    errors.push('Entry year is required and must be a non-empty string');
  } else {
    const year = parseInt(requestData.entryYear);
    if (isNaN(year) || year < 2020 || year > 2030) {
      errors.push('Entry year must be a valid year between 2020 and 2030');
    }
  }

  if (requestData.apCredits && !Array.isArray(requestData.apCredits)) {
    errors.push('AP credits must be an array');
  }

  if (requestData.additionalDetails && typeof requestData.additionalDetails !== 'string') {
    errors.push('Additional details must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Generate placeholder 4-year plan based on user input
function generatePlaceholderPlan(request: PlanRequest): PlanResponse['plan'] {
  const entryYear = parseInt(request.entryYear);
  const graduationYear = entryYear + 4;

  // Sample courses based on major
  const majorCourses: Record<string, CoursePlan[]> = {
    'Computer Science': [
      { code: 'CS 1110', name: 'Introduction to Programming', credits: 3, type: 'Major Required', description: 'Fundamentals of programming and problem-solving' },
      { code: 'CS 2110', name: 'Software Development Methods', credits: 4, type: 'Major Required', description: 'Object-oriented programming and software engineering' },
      { code: 'CS 3330', name: 'Computer Architecture', credits: 4, type: 'Major Required', description: 'Digital logic design and computer systems' },
      { code: 'CS 4102', name: 'Algorithms', credits: 3, type: 'Major Required', description: 'Analysis and design of algorithms' }
    ],
    'Business Administration': [
      { code: 'COMM 2010', name: 'Introduction to Business', credits: 3, type: 'Major Required', description: 'Fundamentals of business operations' },
      { code: 'COMM 2020', name: 'Accounting Fundamentals', credits: 3, type: 'Major Required', description: 'Basic accounting principles and practices' },
      { code: 'COMM 3010', name: 'Marketing Principles', credits: 3, type: 'Major Required', description: 'Introduction to marketing concepts and strategies' },
      { code: 'COMM 4010', name: 'Strategic Management', credits: 3, type: 'Major Required', description: 'Corporate strategy and competitive analysis' }
    ]
  };

  // Focus area electives
  const focusElectives: Record<string, CoursePlan[]> = {
    'Software Development': [
      { code: 'CS 3240', name: 'Advanced Software Development', credits: 3, type: 'Focus Area', description: 'Large-scale software development techniques' },
      { code: 'CS 4720', name: 'Web and Mobile Systems', credits: 3, type: 'Focus Area', description: 'Full-stack web and mobile development' }
    ],
    'Data Science': [
      { code: 'CS 4774', name: 'Machine Learning', credits: 3, type: 'Focus Area', description: 'Algorithms and applications of machine learning' },
      { code: 'DS 4001', name: 'Data Science Methods', credits: 3, type: 'Focus Area', description: 'Statistical methods for data analysis' }
    ],
    'Finance': [
      { code: 'COMM 3030', name: 'Corporate Finance', credits: 3, type: 'Focus Area', description: 'Financial decision-making in corporations' },
      { code: 'COMM 4030', name: 'Investment Analysis', credits: 3, type: 'Focus Area', description: 'Portfolio theory and security analysis' }
    ]
  };

  // General education requirements
  const genEdCourses: CoursePlan[] = [
    { code: 'ENGR 1624', name: 'Introduction to Engineering', credits: 2, type: 'General Education', description: 'Overview of engineering disciplines' },
    { code: 'MATH 1310', name: 'Calculus I', credits: 4, type: 'General Education', description: 'Differential calculus and applications' },
    { code: 'PHYS 1425', name: 'Physics I', credits: 3, type: 'General Education', description: 'Mechanics and thermodynamics' },
    { code: 'ENGL 1010', name: 'Writing & Rhetoric', credits: 3, type: 'General Education', description: 'Academic writing and communication skills' }
  ];

  // Build semester plans
  const semesters: SemesterPlan[] = [];
  const availableMajorCourses = majorCourses[request.major] || majorCourses['Computer Science'];
  const availableFocusCourses = focusElectives[request.focusArea] || focusElectives['Software Development'];

  for (let year = 0; year < 4; year++) {
    // Fall semester
    const fallCourses: CoursePlan[] = [];
    const springCourses: CoursePlan[] = [];

    // Add courses based on year progression
    if (year === 0) {
      // First year: mostly gen ed and intro courses
      fallCourses.push(availableMajorCourses[0], genEdCourses[0], genEdCourses[1]);
      springCourses.push(availableMajorCourses[1], genEdCourses[2], genEdCourses[3]);
    } else if (year === 1) {
      // Second year: more major courses
      fallCourses.push(availableMajorCourses[2], availableFocusCourses[0]);
      springCourses.push(availableMajorCourses[3], availableFocusCourses[1]);
    } else {
      // Upper years: advanced courses and electives
      fallCourses.push(
        { code: `${request.major.substring(0, 4).toUpperCase()} 4${year}00`, name: `Advanced ${request.major}`, credits: 3, type: 'Major Required', description: `Advanced topics in ${request.major}` },
        { code: `ELEC ${3000 + year * 100}`, name: `${request.focusArea} Elective`, credits: 3, type: 'Elective', description: `Specialized course in ${request.focusArea}` }
      );
      springCourses.push(
        { code: `${request.major.substring(0, 4).toUpperCase()} 4${year}50`, name: `${request.major} Capstone`, credits: 4, type: 'Major Required', description: 'Senior capstone project' },
        { code: `ELEC ${3050 + year * 100}`, name: 'Free Elective', credits: 3, type: 'Elective', description: 'Student choice elective' }
      );
    }

    semesters.push({
      semester: `Fall ${entryYear + year}`,
      year: entryYear + year,
      courses: fallCourses,
      totalCredits: fallCourses.reduce((sum, course) => sum + course.credits, 0)
    });

    semesters.push({
      semester: `Spring ${entryYear + year + 1}`,
      year: entryYear + year + 1,
      courses: springCourses,
      totalCredits: springCourses.reduce((sum, course) => sum + course.credits, 0)
    });
  }

  const totalCredits = semesters.reduce((sum, semester) => sum + semester.totalCredits, 0);

  return {
    summary: `4-year academic plan for ${request.major} with ${request.focusArea} focus area, graduating in ${graduationYear}`,
    semesters,
    totalCredits,
    graduationYear
  };
}

// POST handler for the /api/plan endpoint
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse JSON body
    let requestData: unknown;
    try {
      requestData = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          details: 'Request body must contain valid JSON'
        } as PlanResponse,
        { status: 400 }
      );
    }

    // Validate input data
    const validation = validatePlanRequest(requestData);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.errors.join('; ')
        } as PlanResponse,
        { status: 400 }
      );
    }

    // Type-safe request data
    const typedData = requestData as Record<string, unknown>;
    const planRequest: PlanRequest = {
      major: (typedData.major as string).trim(),
      focusArea: (typedData.focusArea as string).trim(),
      entryYear: (typedData.entryYear as string).trim(),
      apCredits: (typedData.apCredits as string[]) || [],
      additionalDetails: (typedData.additionalDetails as string) || ''
    };

    // Generate placeholder plan (will be replaced with RAG pipeline)
    const plan = generatePlaceholderPlan(planRequest);

    // Log request for debugging (remove sensitive data in production)
    console.log(`[/api/plan] Generated plan for ${planRequest.major} - ${planRequest.focusArea}`);

    // Return successful response
    const response: PlanResponse = {
      success: true,
      plan,
      message: 'This is a placeholder response generated from sample data. RAG pipeline integration with Supabase and Groq API is pending implementation.'
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    // Handle unexpected errors
    console.error('[/api/plan] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: 'An unexpected error occurred while processing your request'
      } as PlanResponse,
      { status: 500 }
    );
  }
}

// Handle unsupported HTTP methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      details: 'This endpoint only supports POST requests'
    } as PlanResponse,
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      details: 'This endpoint only supports POST requests'
    } as PlanResponse,
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      details: 'This endpoint only supports POST requests'
    } as PlanResponse,
    { status: 405 }
  );
}