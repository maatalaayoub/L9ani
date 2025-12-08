import Link from "next/link";

export default function Contact() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black py-20 px-6">
            <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800">
                <div className="mb-8">
                    <Link href="/" className="text-sm text-gray-500 hover:text-indigo-600">← Back to Home</Link>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Contact Us</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>

                <form className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input
                            type="text"
                            id="name"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                        <textarea
                            id="message"
                            rows={4}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                            placeholder="How can we help?"
                        ></textarea>
                    </div>

                    <button
                        type="button"
                        className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition"
                    >
                        Send Message
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-sm text-gray-500">Or email us directly at <a href="mailto:support@cryptodash.com" className="text-indigo-600 hover:underline">support@cryptodash.com</a></p>
                </div>
            </div>
        </div>
    );
}
