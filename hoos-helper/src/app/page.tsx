'use client';

import { useState } from 'react';

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    'Calculus BC',
    'AP Computer Science A',
    'AP English Literature',
    'AP History',
    'AP Physics',
    'AP Chemistry',
    'AP Biology',
    'Multiple AP courses (please specify in details)'
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
          <div className='text-gray-700'>
            <label htmlFor="major" className="block text-sm font-medium text-gray-700 mb-2">
              Intended Major *
            </label>
            <select
              id="major"
              value={formData.major}
              onChange={(e) => handleInputChange('major', e.target.value)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.major ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select your major</option>
              {majors.map(major => (
                <option key={major} value={major}>{major}</option>
              ))}
            </select>
            {errors.major && <p className="mt-1 text-sm text-red-600">{errors.major}</p>}
          </div>

          {/* Focus Area Selection */}
          <div className='text-gray-700'>
            <label htmlFor="focusArea" className="block text-sm font-medium text-gray-700 mb-2">
              Focus Area / Concentration *
            </label>
            <select
              id="focusArea"
              value={formData.focusArea}
              onChange={(e) => handleInputChange('focusArea', e.target.value)}
              disabled={!formData.major}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                errors.focusArea ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">
                {formData.major ? 'Select your focus area' : 'Please select a major first'}
              </option>
              {formData.major && focusAreas[formData.major]?.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            {errors.focusArea && <p className="mt-1 text-sm text-red-600">{errors.focusArea}</p>}
          </div>

          {/* Entry Year Selection */}
          <div className='text-gray-700'>
            <label htmlFor="entryYear" className="block text-sm font-medium text-gray-700 mb-2">
              Entry Year *
            </label>
            <select
              id="entryYear"
              value={formData.entryYear}
              onChange={(e) => handleInputChange('entryYear', e.target.value)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.entryYear ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select your entry year</option>
              {entryYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            {errors.entryYear && <p className="mt-1 text-sm text-red-600">{errors.entryYear}</p>}
          </div>

          {/* AP/IB Credits */}
          <div className="text-gray-700 relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Advanced Placement (AP/IB) Credits
            </label>

            {/* Dropdown button (styled like select) */}
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`w-full flex justify-between items-center p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.apCredits ? "border-red-500" : "border-gray-300"
              }`}
            >
              <span className={formData.apCredits.length === 0 ? "text-gray-400" : ""}>
                {formData.apCredits.length > 0
                  ? formData.apCredits.join(", ")
                  : "Select AP/IB credits (optional)"}
              </span>
              <svg
                className="w-4 h-4 ml-2 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto p-2">
                {apCreditsOptions.slice(1).map(credit => (
                  <label key={credit} className="flex items-center space-x-2 p-1 cursor-pointer">
                    <input
                      type="checkbox"
                      value={credit}
                      checked={formData.apCredits.includes(credit)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleInputChange("apCredits", [...formData.apCredits, credit]);
                        } else {
                          handleInputChange(
                            "apCredits",
                            formData.apCredits.filter(c => c !== credit)
                          );
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{credit}</span>
                  </label>
                ))}
              </div>
            )}

            {errors.apCredits && <p className="mt-1 text-sm text-red-600">{errors.apCredits}</p>}
          </div>


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