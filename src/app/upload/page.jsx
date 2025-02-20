'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function UploadPage() {
    const [pdfFile, setPdfFile] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inputMessage, setInputMessage] = useState('');
    const [quizText, setQuizText] = useState('');
    const [quizGenerated, setQuizGenerated] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const chatRef = useRef(null);
    const typingIntervalRef = useRef(null);
    const fullTextRef = useRef('');

    const onDrop = useCallback((acceptedFiles) => {
        const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
        if (pdfFiles.length > 0) {
            setPdfFile(pdfFiles[0]);
            toast.success('PDF file uploaded successfully!');
        } else {
            toast.error('Please upload a valid PDF file.');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        disabled: quizGenerated,
    });

    const simulateTypingEffect = (fullText) => {
        if (!fullText) return;
        fullTextRef.current = fullText;
        setIsTyping(true);
        setMessages((prev) => [
            ...prev,
            { role: 'assistant', text: fullText.charAt(0) },
        ]);
        let currentIndex = 1;
        typingIntervalRef.current = setInterval(() => {
            setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages];
                updatedMessages[updatedMessages.length - 1] = {
                    role: 'assistant',
                    text: fullText.slice(0, currentIndex + 1),
                };
                return updatedMessages;
            });
            currentIndex++;
            if (currentIndex === fullText.length) {
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
                setIsTyping(false);
            }
        }, 0);
    };

    const handleInstantComplete = () => {
        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
            setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages];
                updatedMessages[updatedMessages.length - 1] = {
                    role: 'assistant',
                    text: fullTextRef.current,
                };
                return updatedMessages;
            });
            setIsTyping(false);
        }
    };

    const handleUpload = async () => {
        if (!pdfFile) {
            toast.error('No PDF file selected.');
            return;
        }
        setLoading(true);

        // Indicate a PDF has been uploaded.
        setMessages((prev) => [
            ...prev,
            { role: 'user', text: 'I have uploaded a PDF file.' },
        ]);

        const formData = new FormData();
        formData.append('file', pdfFile);

        try {
            const response = await fetch('/api/quiz', {
                method: 'POST',
                body: formData,
            });
            const data = await response?.json();
            const quiz = data?.quiz?.join('\n');
            setQuizText(quiz);

            // Use the typing effect for the assistant's quiz message.
            simulateTypingEffect(quiz);

            // Mark that the quiz has been generated.
            setQuizGenerated(true);
            toast.success('Quiz generated successfully!');
        } catch (error) {
            console.error('Error generating quiz:', error);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', text: 'Error generating quiz.' },
            ]);
            toast.error('Error generating quiz.');
        } finally {
            setLoading(false);
        }
    };

    // Scroll to chat once quiz is generated.
    useEffect(() => {
        if (quizGenerated && chatRef.current) {
            chatRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [quizGenerated]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;
        const userMessage = inputMessage.trim();
        setMessages((prev) => [
            ...prev,
            { role: 'user', text: userMessage },
        ]);
        setInputMessage('');
        setLoading(true);

        try {
            const response = await fetch('/api/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: userMessage, quiz: quizText }),
            });
            const data = await response.json();
            // Typing effect for the assistant's reply.
            simulateTypingEffect(data.reply);
            toast.success('Message sent successfully!');
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', text: 'Error sending message.' },
            ]);
            toast.error('Error sending message.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    // Download quiz as a Word document.
    const handleDownloadWord = () => {
        const blob = new Blob([quizText], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quiz.doc';
        a.click();
        URL.revokeObjectURL(url);
        toast.info('Download initiated!');
    };

    return (
        <div className="min-h-screen bg-gradient-to-r from-indigo-600 to-purple-600 flex flex-col items-center p-4 sm:p-8">
            <ToastContainer />
            <h1 className="text-xl sm:text-2xl font-extrabold mb-6 text-white">
                Generate your quiz
            </h1>

            {/* Upload Section */}
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-6 mb-8 md:h-[70vh] h-auto">
                <motion.div
                    {...getRootProps()}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${quizGenerated
                        ? 'border-gray-300 bg-gray-100'
                        : 'border-gray-300 hover:border-indigo-600'
                        } md:h-[50vh] h-[30vh]`}
                >
                    <input {...getInputProps()} />
                    {pdfFile ? (
                        <p className="text-base sm:text-lg text-gray-700">{pdfFile.name}</p>
                    ) : isDragActive ? (
                        <p className="text-base sm:text-lg text-indigo-500">
                            Drop your PDF here ...
                        </p>
                    ) : (
                        <p className="text-base sm:text-lg text-gray-500">
                            Drag and drop your PDF file here, or click to select
                        </p>
                    )}
                </motion.div>
                {!quizGenerated && (
                    <div className="text-center mt-4">
                        <motion.button
                            onClick={handleUpload}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                            disabled={loading || !pdfFile}
                        >
                            {loading ? 'Generating Quiz...' : 'Generate Quiz!'}
                        </motion.button>
                    </div>
                )}
            </div>

            {quizGenerated && quizText && (
                <motion.button
                    onClick={handleDownloadWord}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-purple-400 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded transition-colors duration-200 mb-6"
                >
                    Download!
                </motion.button>
            )}

            {/* Chat Section */}
            {quizGenerated && (
                <motion.div
                    ref={chatRef}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-full max-w-4xl bg-white rounded-xl shadow-lg p-6"
                >
                    {/* Instant Complete Button */}
                    {isTyping && (
                        <motion.button
                            onClick={handleInstantComplete}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="absolute top-2 right-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs font-bold py-1 px-2 rounded"
                        >
                            Instant
                        </motion.button>
                    )}
                    <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                        {messages.length === 0 ? (
                            <p className="text-center text-gray-500">
                                No messages yet. Your chat will appear here.
                            </p>
                        ) : (
                            <AnimatePresence>
                                {messages.map((message, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                        className={`max-w-[80%] p-3 rounded-lg ${message.role === 'assistant'
                                            ? 'bg-gray-200 text-gray-900 self-start'
                                            : 'bg-green-100 text-green-800 self-end'
                                            }`}
                                    >
                                        {message.role === 'assistant' ? (
                                            <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                                                {message.text}
                                            </ReactMarkdown>
                                        ) : (
                                            message.text.split('\n').map((line, idx) => (
                                                <p key={idx}>{line}</p>
                                            ))
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                        {loading && (
                            <div className="flex justify-center mt-4">
                                <Loader className="animate-spin text-indigo-500" size={24} />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row mt-4">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message about the quiz..."
                            className="flex-1 min-w-0 border border-gray-300 rounded-t sm:rounded-l px-4 py-2 focus:outline-none text-black transition duration-300"
                        />
                        <motion.button
                            onClick={handleSendMessage}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-b sm:rounded-r transition-colors duration-200"
                            disabled={loading}
                        >
                            Send
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
