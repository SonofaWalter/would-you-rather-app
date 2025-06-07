import React, { useState } from 'react';

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
     * Generates a new "Would You Rather" question using the Gemini API.
     */
    const generateQuestion = async () => {
        setIsLoading(true); // Set loading state to true
        setError(''); // Clear any previous errors
        setQuestion(null); // Clear the current question

        try {
            // Construct the prompt for the AI based on the selected category
            // This prompt encourages concise, creative, and generally humorous or thought-provoking options,
            // while explicitly avoiding negative or sad twists.
            const prompt = `Generate a "Would You Rather" question about ${category}. Make the options concise, creative, and generally humorous or thought-provoking. Avoid any negative or sad twists. Provide two distinct options (optionA and optionB) that are balanced in difficulty. Ensure the response is in JSON format with keys "optionA" and "optionB".`;

            // Prepare the payload for the Gemini API request
            const payload = {
                contents: [{
                    role: "user",
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            "optionA": { "type": "STRING" },
                            "optionB": { "type": "STRING" }
                        },
                        "propertyOrdering": ["optionA", "optionB"]
                    }
                }
            };

            // Define the API URL for Gemini 2.0 Flash (using empty API key for Canvas runtime)
            // The apiKey will be automatically provided by the Canvas environment at runtime.
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            // Make the API call to Gemini
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Check if the HTTP response was successful (status code 200-299)
            if (!response.ok) {
                // If the response is not OK, parse the error message from the API response
                const errorData = await response.json();
                throw new Error(`API error: ${response.status} - ${errorData.error.message || 'Unknown error'}`);
            }

            // Parse the successful JSON response from the API
            const result = await response.json();

            // Validate the structure of the AI's response to ensure it contains the expected question data
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {

                const jsonString = result.candidates[0].content.parts[0].text;
                let parsedQuestion;
                try {
                    // Attempt to parse the JSON string into a JavaScript object
                    parsedQuestion = JSON.parse(jsonString);
                } catch (parseError) {
                    // If JSON parsing fails, throw an error indicating invalid format
                    throw new Error("Failed to parse AI response: Invalid JSON format.");
                }

                // Ensure the parsed object has both 'optionA' and 'optionB' keys
                if (parsedQuestion.optionA && parsedQuestion.optionB) {
                    setQuestion(parsedQuestion); // Update state with the new question
                } else {
                    // If expected keys are missing, throw an error
                    throw new Error("AI response missing 'optionA' or 'optionB' keys.");
                }
            } else {
                // If the overall AI response structure is not as expected, throw an error
                throw new Error("AI did not return a valid question.");
            }

        } catch (err) {
            // Catch any errors that occur during the fetch or parsing process
            console.error("Error generating question:", err);
            setError(`Failed to generate question: ${err.message}. Please try again.`);
        } finally {
            // Always reset the loading state, regardless of success or failure
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-800 flex flex-col items-center justify-center p-4 font-inter text-white">
            {/* Main container for the "Would You Rather" app, styled with Tailwind CSS */}
            <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-2xl text-center border border-white border-opacity-20 transform transition-all duration-300 hover:scale-[1.01]">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-shadow-lg animate-fade-in-down">
                    Would You Rather?
                </h1>

                {/* Category selection buttons, dynamically rendered from the 'categories' array */}
                <div className="mb-8 flex flex-wrap justify-center gap-2">
                    {categories.map((cat) => (
                        <button
                            key={cat} // Unique key for each button for React list rendering
                            onClick={() => handleCategoryChange(cat)} // Update category on click
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ease-in-out
                                ${category === cat // Apply active styling if this category is selected
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30 hover:shadow-lg'
                                }`}
                            disabled={isLoading} // Disable category buttons while a question is being generated
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Displays the currently selected category */}
                <p className="text-lg mb-6 text-white text-opacity-80">
                    Category: <span className="font-bold text-yellow-300">{category}</span>
                </p>

                {/* Loading spinner and message displayed while fetching a new question */}
                {isLoading && (
                    <div className="flex justify-center items-center h-24">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
                        <p className="ml-4 text-lg">Generating question...</p>
                    </div>
                )}

                {/* Error message displayed if an API call or parsing error occurs */}
                {error && (
                    <div className="bg-red-500 bg-opacity-70 text-white p-4 rounded-xl mb-6 text-lg font-medium shadow-md">
                        <p>{error}</p>
                    </div>
                )}

                {/* Displays the generated "Would You Rather" question options */}
                {/* Only renders if a question exists and not currently loading */}
                {question && !isLoading && (
                    <div className="mb-8 text-lg md:text-2xl font-bold text-yellow-200 space-y-6 animate-fade-in">
                        <div className="bg-white bg-opacity-15 p-6 rounded-2xl shadow-xl border border-white border-opacity-25 hover:bg-opacity-20 transition duration-300">
                            <span className="text-pink-300">A:</span> {question.optionA}
                        </div>
                        <p className="text-xl md:text-3xl font-extrabold text-white text-shadow-lg my-4">OR</p>
                        <div className="bg-white bg-opacity-15 p-6 rounded-2xl shadow-xl border border-white border-opacity-25 hover:bg-opacity-20 transition duration-300">
                            <span className="text-blue-300">B:</span> {question.optionB}
                        </div>
                    </div>
                )}

                {/* Button to trigger question generation */}
                <button
                    onClick={generateQuestion} // Call generateQuestion function on click
                    className="mt-6 px-8 py-4 bg-gradient-to-r from-green-400 to-blue-500 text-white text-xl font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading} // Disable button while loading
                >
                    {question ? 'Generate New Question' : 'Start Playing!'} {/* Text changes based on whether a question is displayed */}
                </button>
            </div>
        </div>
    );
};

export default App;
