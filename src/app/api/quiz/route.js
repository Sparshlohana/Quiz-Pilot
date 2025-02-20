// app/api/quiz/route.js
import { NextResponse } from 'next/server';
import { PdfReader } from 'pdfreader';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper function to extract text using pdfreader
function extractTextUsingPdfReader(buffer) {
    return new Promise((resolve, reject) => {
        let extractedText = '';
        new PdfReader().parseBuffer(buffer, (err, item) => {
            if (err) {
                return reject(err);
            } else if (!item) {
                // When item is falsy, the reading is complete.
                return resolve(extractedText);
            } else if (item.text) {
                // Append the text found on this item.
                extractedText += item.text + ' ';
            }
        });
    });
}

export async function POST(request) {
    const contentType = request.headers.get('content-type') || '';

    // Branch for PDF upload and quiz generation.
    if (contentType.includes('multipart/form-data')) {
        try {
            const formData = await request.formData();
            const file = formData.get('file');
            if (!file) {
                return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
            }

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const extractedText = await extractTextUsingPdfReader(buffer);
            if (!extractedText || extractedText.trim() === '') {
                return NextResponse.json(
                    { error: 'PDF contains no extractable text.' },
                    { status: 400 }
                );
            }

            // Setup Gemini AI using your provided configuration.
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
            }
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash-thinking-exp-01-21',
            });
            const generationConfig = {
                temperature: 0.7,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 65536,
                responseMimeType: 'text/plain',
            };

            const prompt = `Generate a quiz for the following text:\n\n${extractedText}.`;
            const chatSession = model.startChat({
                generationConfig,
                history: [],
            });
            const result = await chatSession.sendMessage(prompt);
            const responseText = result.response.text();

            // Split the response by newlines to create an array of quiz questions.
            const quiz = responseText.split('\n').filter((line) => line.trim() !== '');

            return NextResponse.json({ quiz });
        } catch (error) {
            console.error('Error in generating quiz:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    }
    // Branch for follow-up questions about the quiz.
    else if (contentType.includes('application/json')) {
        try {
            const { question, quiz } = await request.json();
            if (!question || !quiz) {
                return NextResponse.json(
                    { error: 'Missing question or quiz context.' },
                    { status: 400 }
                );
            }

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
            }
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash-thinking-exp-01-21',
            });
            const generationConfig = {
                temperature: 0.7,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 65536,
                responseMimeType: 'text/plain',
            };

            // Build a prompt that uses the quiz as context.
            const prompt = `Below is a quiz generated from a PDF:\n\n${quiz}\n\nAnswer the following question about the quiz:\n${question}`;

            const chatSession = model.startChat({
                generationConfig,
                history: [],
            });
            const result = await chatSession.sendMessage(prompt);
            const responseText = result.response.text();

            return NextResponse.json({ reply: responseText });
        } catch (error) {
            console.error('Error in handling quiz question:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    } else {
        return NextResponse.json(
            { error: 'Unsupported content type.' },
            { status: 400 }
        );
    }
}
