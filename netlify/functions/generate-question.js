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
    // IMPORTANT CHANGE: Using 'gemini-2.0-flash' model which is widely supported for generateContent
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

        // Parse the response to extract Option A and Option B
        let optionA = "Would you rather have a pet dragon";
        let optionB = "Or a pet unicorn";

        // Regex to extract options. It's more robust now that Markdown might be present.
        // This regex attempts to be flexible about what comes before 'A:' and 'OR B:'.
        // It captures everything after 'A:' until 'OR B:' for optionA, and everything after 'OR B:' for optionB.
        const regex = /(?:^|\s*)A:\s*(.*?)(?:\s*OR\s*B:\s*(.*))?$/i;
        const match = text.match(regex);

        if (match && match[1]) { // Ensure Option A is always captured
            optionA = match[1].trim();
            if (match[2]) { // Option B is optional in case of partial matches, but we expect it.
                optionB = match[2].trim();
            } else {
                // If only Option A is found, assume the rest of the text is Option B
                // This is a fallback and might not always produce ideal results if the format is very off.
                const remainingText = text.substring(match[0].length).trim();
                optionB = remainingText || "or face a new challenge?"; // Fallback for Option B
                console.warn("Partial match found for Gemini response. Option B inferred:", text);
            }
        } else {
            // Log the raw response if parsing fails for debugging
            console.warn("Could not parse Gemini response into A and B options:", text);
            // Fallback to a generic question if parsing fails entirely
            optionA = "Would you rather always be 10 minutes late,";
            optionB = "or always be 20 minutes early?";
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
