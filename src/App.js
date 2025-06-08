import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // This import is correct and needed for Markdown rendering

// Main App component for the "Would You Rather" game
const App = () => {
    // State variables for managing the app's data and UI
    const [category, setCategory] = useState('General'); // Currently selected question category
    const [question, setQuestion] = useState(null); // Stores the generated question (optionA, optionB)
    const [isLoading, setIsLoading] = useState(false); // Flag to indicate if a question is being generated
    const [error, setError] = useState(''); // Stores any error messages

    // Define the available categories for "Would You Rather" questions
    const categories = [
        'General',
        'Silly Superpowers',
        'Food',
        'Travel',
        'Fantasy',
        'Tech',
        'Life Dilemmas',
        'Humorous',
        'Sports',
        'Dollar Dilemma',
        'Pop Culture',
        'Ethical Dilemmas',
        'Nature & Animals',
        'Serious Superpower',
    ];

    /**
     * Handles the category selection.
     * @param {string} selectedCategory - The category chosen by the user.
     */
    const handleCategoryChange = (selectedCategory) => {
        setCategory(selectedCategory);
        setQuestion(null); // Clear the current question when category changes
        setError(''); // Clear any previous errors
    };

    /**
     * Generates a new "Would You Rather" question using the Netlify Function.
     */
    const generateQuestion = async () => {
        setIsLoading(true); // Set loading state to true
        setError(''); // Clear any previous errors
        setQuestion(null); // Clear the current question

        try {
            // Call our Netlify Function to get a Markdown-formatted question
            const response = await fetch('/.netlify/functions/generate-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: category }) // Send the selected category to the function
            });

            // Check if the Netlify Function's response was successful
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Function error: ${response.status} - ${errorData.message || 'Unknown error from Netlify Function'}`);
            }

            const result = await response.json();

            // Validate the structure of the question returned by the Netlify Function
            if (result.optionA && result.optionB) {
                setQuestion(result); // Update state with the new question
            } else {
                throw new Error("Netlify Function did not return a valid question format.");
            }

        } catch (err) {
            console.error("Error generating question:", err);
            setError(`Failed to generate question: ${err.message}. Please try again.`);
        } finally {
            setIsLoading(false); // Always reset the loading state
        }
    };

    return (
        // Main container with dark mode background gradient
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center p-4 font-inter text-white">
            {/* Central content card with dark transparent background, rounded corners, and shadow */}
            <div className="bg-gray-800 bg-opacity-70 backdrop-filter backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-2xl text-center border border-purple-700 border-opacity-50 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-purple-500/50">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-shadow-lg animate-fade-in-down">
                    Would You Rather?
                </h1>

                {/* Category selection buttons with new styling */}
                <div className="mb-8 flex flex-wrap justify-center gap-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryChange(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ease-in-out
                                ${category === cat
                                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg'
                                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white hover:shadow-md'
                                }`}
                            disabled={isLoading}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Displays the currently selected category */}
                <p className="text-lg mb-6 text-gray-300">
                    Category: <span className="font-bold text-pink-400">{category}</span>
                </p>

                {/* Loading spinner and message */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-pink-500 border-opacity-75"></div>
                        <p className="mt-4 text-xl text-purple-300">Summoning a dilemma...</p>
                    </div>
                )}

                {/* Error message display */}
                {error && (
                    <div className="bg-red-700 bg-opacity-80 text-white p-4 rounded-xl mb-6 text-lg font-medium shadow-md">
                        <p>{error}</p>
                    </div>
                )}

                {/* Styled question options section */}
                {question && !isLoading && (
                    <div className="mb-8 text-lg md:text-2xl font-bold text-gray-100 space-y-6 animate-fade-in">
                        <div className="bg-gray-700 bg-opacity-80 p-6 rounded-2xl shadow-xl border border-purple-600 border-opacity-50 hover:bg-gray-600 transition duration-300 transform hover:scale-[1.02]">
                            <span className="text-pink-400">A:</span> <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert max-w-none text-gray-100">{question.optionA}</ReactMarkdown>
                        </div>
                        <p className="text-xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 text-shadow-lg my-4">OR</p>
                        <div className="bg-gray-700 bg-opacity-80 p-6 rounded-2xl shadow-xl border border-pink-600 border-opacity-50 hover:bg-gray-600 transition duration-300 transform hover:scale-[1.02]">
                            <span className="text-purple-400">B:</span> <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert max-w-none text-gray-100">{question.optionB}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* Generate New Question button with vibrant gradient and rounded corners */}
                <button
                    onClick={generateQuestion} // Call generateQuestion function on click
                    className="mt-6 px-10 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xl font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading} // Disable button while loading
                >
                    {question ? 'Unravel Another Dilemma!' : 'Begin the Quandary!'} {/* Text changes based on whether a question is displayed */}
                </button>
            </div>
        </div>
    );
};

export default App;
