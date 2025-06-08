// This Netlify Function acts as a secure proxy to the Gemini API.
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

    try {
        // Parse the request body to get the category sent from the React app
        const body = JSON.parse(event.body);
        if (body && body.category) {
            category = body.category;
        }
    } catch (parseError) {
        // If the body is malformed, log the error but proceed with default category
        console.error('Failed to parse request body:', parseError);
    }

    // Retrieve the Gemini API key from Netlify Environment Variables.
    // This keeps the API key secure and out of the client-side code.
    const apiKey = process.env.GEMINI_API_KEY;

    // Check if the API key is available
    if (!apiKey) {
        console.error('GEMINI_API_KEY is not set in Netlify environment variables.');
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: API key missing.' }),
        };
    }

    // Initialize the Google Generative AI client with the API key
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the gemini-2.0-flash model for text generation
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Construct the prompt for the AI based on the received category
    const prompt = `Generate a "Would You Rather" question about ${category}. Make the options concise, creative, and generally humorous or thought-provoking. Avoid any negative or sad twists. Provide two distinct options (optionA and optionB) that are balanced in difficulty. Ensure the response is in JSON format with keys "optionA" and "optionB".`;

    try {
        // Make the API call to Gemini 2.0 Flash
        const result = await model.generateContent({
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
        });

        // Extract the JSON string from the AI's response
        const responseText = result.response.candidates[0].content.parts[0].text;
        const parsedQuestion = JSON.parse(responseText);

        // Return the parsed question in the response to the frontend
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsedQuestion),
        };

    } catch (error) {
        console.error('Error calling Gemini API from Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error generating question from AI.', error: error.message }),
        };
    }
};
