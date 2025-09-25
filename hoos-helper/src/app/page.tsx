'use client';

import { useState } from 'react';

type DropdownProps = {
  label: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: string[];
  multiple?: boolean;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

function Dropdown({
  label,
  value,
  onChange,
  options,
  multiple = false,
  placeholder = "Select an option",
  error,
}: DropdownProps) {
  const [open, setOpen] = useState(false);

  const isMulti = Array.isArray(value);

  return (
    <div className="text-gray-700 relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      {/* Dropdown button (shared style) */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full text-left flex justify-between items-center p-3 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      >
        <span
          className={`truncate ${
            (isMulti && (value as string[]).length === 0) ||
            (!isMulti && !value)
              ? "text-gray-400"
              : "text-gray-900"
          }`}
        >
          {isMulti
            ? (value as string[]).length > 0
              ? (value as string[]).join(", ")
              : placeholder
            : value || placeholder}
        </span>
        <svg
          className="w-4 h-4 ml-2 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto p-2">
          {options.map((opt) => (
            <label
              key={opt}
              className={`flex items-center space-x-2 p-1 cursor-pointer ${
                multiple ? "hover:bg-gray-100 rounded" : ""
              }`}
            >
              {multiple ? (
                <input
                  type="checkbox"
                  value={opt}
                  checked={(value as string[]).includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...(value as string[]), opt]);
                    } else {
                      onChange(
                        (value as string[]).filter((v) => v !== opt)
                      );
                    }
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              ) : (
                <input
                  type="radio"
                  name={label}
                  value={opt}
                  checked={value === opt}
                  onChange={() => {
                    onChange(opt);
                    setOpen(false); // close after selecting
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
              )}
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface FormData {
  major: string;
  focusArea: string;
  entryYear: string;
  apCredits: string[];
  additionalDetails: string;
}

interface FormErrors {
  major?: string;
  focusArea?: string;
  entryYear?: string;
  apCredits?: string;
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    major: '',
    focusArea: '',
    entryYear: '',
    apCredits: [],
    additionalDetails: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Sample data - in a real app, these would come from API endpoints
  const majors = [
    'Computer Science',
    'Business Administration',
    'Psychology',
    'Biology',
    'Engineering',
    'Economics',
    'English',
    'History',
    'Mathematics',
    'Political Science'
  ];

  const focusAreas: Record<string, string[]> = {
    'Computer Science': ['Software Development', 'Data Science', 'Cybersecurity', 'AI/Machine Learning'],
    'Business Administration': ['Finance', 'Marketing', 'Management', 'Entrepreneurship'],
    'Psychology': ['Clinical Psychology', 'Cognitive Psychology', 'Social Psychology', 'Developmental Psychology'],
    'Biology': ['Pre-Med', 'Research', 'Environmental Biology', 'Molecular Biology'],
    'Engineering': ['Civil', 'Mechanical', 'Electrical', 'Computer Engineering'],
    'Economics': ['Public Policy', 'Finance', 'International Economics', 'Behavioral Economics'],
    'English': ['Literature', 'Creative Writing', 'Rhetoric', 'Linguistics'],
    'History': ['American History', 'European History', 'World History', 'Public History'],
    'Mathematics': ['Pure Mathematics', 'Applied Mathematics', 'Statistics', 'Actuarial Science'],
    'Political Science': ['International Relations', 'Public Administration', 'Political Theory', 'Comparative Politics']
  };

  const entryYears = ['2025', '2026', '2027', '2028'];

  const apCreditsOptions = [
    '',
    'None',
    'AP Research',
    'AP Seminar',
    'AP English Language and Composition',
    'AP English Literature and Composition',
    'AP Spanish Language and Culture',
    'AP Spanish Literature and Culture',
    'AP French Language and Culture',
    'AP German Language and Culture',
    'AP Italian Language and Culture',
    'AP Chinese Language and Culture',
    'AP Japanese Language and Culture',
    'AP Latin',
    'AP Environmental Science',
    'AP Physics 1',
    'AP Physics 2',
    'AP Physics C: Mechanics',
    'AP Physics C: Electricity and Magnetism',
    'AP Chemistry',
    'AP Biology',
    'AP Computer Science Principles',
    'AP Statistics',
    'AP Calculus AB',
    'AP Calculus BC',
    'AP Precalculus',
    'AP Computer Science A',
    'AP World History: Modern',
    'AP European History',
    'AP Human Geography',
    'AP African American Studies',
    'AP US History',
    'AP US Government and Politics',
    'AP Comparative Government and Politics',
    'AP Macroeconomics',
    'AP Microeconomics',
    'AP Psychology',
    'AP 2D Art and Design',
    'AP 3D Art and Design',
    'AP Drawing',
    'AP Art History',
    'AP Music Theory',
  ];

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  
    // Reset focus area when major changes
    if (field === 'major') {
      setFormData(prev => ({
        ...prev,
        focusArea: ''
      }));
    }
  };
  

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.major) {
      newErrors.major = 'Please select your intended major';
    }
    if (!formData.focusArea) {
      newErrors.focusArea = 'Please select a focus area';
    }
    if (!formData.entryYear) {
      newErrors.entryYear = 'Please select your entry year';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSubmitMessage(null);

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await response.json();
        setSubmitMessage({
          type: 'success',
          text: 'Your academic plan has been generated successfully! Check the response below.'
        });
      } else {
        throw new Error('Failed to generate academic plan');
      }
    } catch {
      setSubmitMessage({
        type: 'error',
        text: 'Sorry, there was an error generating your plan. The API endpoint is not yet implemented. Please try again later.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Hoo&apos;s Helper</h1>
          <p className="text-xl text-gray-600">Your UVA Course Planning Assistant</p>
          <p className="text-sm text-gray-500 mt-2">Get personalized four-year academic plans</p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {/* Major Selection */}
          <Dropdown
            label="Intended Major *"
            value={formData.major}
            onChange={(val) => handleInputChange("major", val as string)}
            options={majors}
            placeholder="Select your major"
            error={errors.major}
          />

          {/* Focus Area Selection */}
            <Dropdown
              label="Focus Area *"
              value={formData.focusArea}
              onChange={(value) => handleInputChange("focusArea", value)}
              placeholder={formData.major ? "Select your focus area" : "Please select a major first"}
              options={formData.major ? focusAreas[formData.major] || [] : []}
              disabled={!formData.major}
              error={errors.focusArea}
            />

          {/* Entry Year Selection */}
          <Dropdown
            label="Entry Year *"
            value={formData.entryYear}
            onChange={(val) => handleInputChange("entryYear", val as string)}
            options={entryYears}
            placeholder="Select your entry year"
            error={errors.entryYear}
          />

          {/* AP/IB Credits */}
          <Dropdown
            label="Advanced Placement (AP/IB) Credits"
            value={formData.apCredits}
            onChange={(val) => handleInputChange("apCredits", val as string[])}
            options={apCreditsOptions.slice(1)}
            multiple
            placeholder="Select AP/IB credits (optional)"
            error={errors.apCredits}
          />


          {/* Additional Details */}
          <div className='text-gray-700'>
            <label htmlFor="additionalDetails" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Details
            </label>
            <textarea
              id="additionalDetails"
              value={formData.additionalDetails}
              onChange={(e) => handleInputChange('additionalDetails', e.target.value)}
              placeholder="e.g., I want to study abroad in year 3, interested in internships, prefer morning classes..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isLoading ? 'Generating Your Plan...' : 'Generate My 4-Year Plan'}
          </button>

          {/* Submit Message */}
          {submitMessage && (
            <div className={`p-4 rounded-lg ${
              submitMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {submitMessage.text}
            </div>
          )}
        </form>

        <footer className="text-center text-gray-500 text-sm mt-8">
          <p>Powered by AI • University of Virginia • Hoo&apos;s Helper MVP</p>
        </footer>
      </div>
    </div>
  );
}