// This is a Netlify Function that acts as a secure proxy to the Gemini API.
// It receives a category from the frontend, constructs a prompt,
// calls the Gemini API using a securely stored API key, and returns the AI's response.

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Main handler for the Netlify Function
exports.handler = async (event) => {
    // Only allow POST requests for this function
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    let category = 'General'; // Default category

    // Parse the request body to get the category sent from the React app
    try {
        const body = JSON.parse(event.body);
        if (body && body.category) {
            category = body.category;
        }
    } catch (parseError) {
        // If the body is malformed, log the error but proceed with default category
        console.error('Failed to parse request body:', parseError);
    }

    // Access your GEMINI_API_KEY from Netlify Environment Variables
    const API_KEY = process.env.GEMINI_API_KEY;

    // Check if the API key is available
    if (!API_KEY) {
        console.error('GEMINI_API_KEY is not set in Netlify environment variables.');
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: API key not set.' }),
        };
    }

    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(API_KEY);
    // Using 'gemini-2.0-flash' model which is widely supported for generateContent
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Define the prompt for the Gemini API.
    // The prompt explicitly asks for Markdown formatting within the options.
    const prompt = `Generate a unique "Would You Rather" question with two distinct options.
The response should be in the format: "A: [Option A Text] OR B: [Option B Text]".
The text for Option A and Option B can include Markdown formatting like **bold** or *italics*.
The category is: ${category}.`;

    try {
        // Send the prompt to the Gemini API
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text(); // Get the plain text content from the API response

        let optionA = "Would you rather always be 10 minutes late,"; // Fallback in case parsing fails
        let optionB = "or always be 20 minutes early?"; // Fallback in case parsing fails

        // IMPROVED REGEX:
        // This regex is designed to be more flexible.
        // It looks for "A: " then captures everything (non-greedy) until " OR B: "
        // Then it captures everything after " OR B: " until the end of the string.
        // It's case-insensitive and supports multi-line.
        const regex = /A:\s*(.*?)\s*OR\s*B:\s*(.*)/is; // Added 's' flag for dotall, 'i' for case-insensitive
        const match = text.match(regex);

        if (match && match[1] && match[2]) {
            optionA = match[1].trim();
            optionB = match[2].trim();
        } else {
            // If the primary regex fails, try a simpler one in case "OR B:" is missing or malformed
            const simpleARegex = /A:\s*(.*)/is;
            const simpleAMatch = text.match(simpleARegex);
            if (simpleAMatch && simpleAMatch[1]) {
                optionA = simpleAMatch[1].trim();
                // Attempt to split if only A: is found, assuming rest is B:
                const splitIndex = optionA.indexOf('B:');
                if (splitIndex !== -1) {
                    optionB = optionA.substring(splitIndex + 2).trim();
                    optionA = optionA.substring(0, splitIndex).trim();
                } else {
                    // If no B: found, try to intelligently split by common separators or assume single option
                    const potentialSeparator = optionA.indexOf(' or ');
                    if (potentialSeparator !== -1 && optionA.length > potentialSeparator + 4) {
                        optionB = optionA.substring(potentialSeparator + 4).trim();
                        optionA = optionA.substring(0, potentialSeparator).trim();
                    } else {
                        // If all else fails, use the whole thing for A, and a generic B
                        console.warn("Could not find clear 'OR B:' for splitting. Using generic B.", text);
                        optionB = "or a different challenge?";
                    }
                }
            } else {
                // If even the simple A: regex fails, then the response format is completely off.
                console.warn("Could not parse Gemini response into A and B options:", text);
            }
        }

        // Return the parsed options as JSON
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ optionA, optionB }),
        };
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error generating question from AI.", details: error.message }),
        };
    }
};
