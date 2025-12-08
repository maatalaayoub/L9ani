import Link from "next/link";

export default function About() {
    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="max-w-4xl mx-auto px-6 py-20">
                {/* Breadcrumb */}
                <div className="mb-8">
                    <Link href="/" className="text-sm text-gray-500 hover:text-indigo-600">← Back to Home</Link>
                </div>

                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">About CryptoDash</h1>

                <div className="prose dark:prose-invert max-w-none">
                    <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                        CryptoDash was born from a simple idea: that cryptocurrency trading shouldn't be complicated. We set out to build a platform that combines professional-grade tools with an intuitive interface that anyone can master.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">Our Mission</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        To democratize access to the global financial system by providing a secure, transparent, and easy-to-use platform for digital asset exchange.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">Why Choose Us?</h2>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 list-none pl-0">
                        <li className="bg-gray-50 dark:bg-zinc-900 p-6 rounded-lg">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Bank-Grade Security</h3>
                            <p className="text-sm text-gray-500">Your assets are protected by industry-leading encryption and cold storage protocols.</p>
                        </li>
                        <li className="bg-gray-50 dark:bg-zinc-900 p-6 rounded-lg">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Lightning Fast</h3>
                            <p className="text-sm text-gray-500">Our matching engine handles millions of transactions per second with zero downtime.</p>
                        </li>
                        <li className="bg-gray-50 dark:bg-zinc-900 p-6 rounded-lg">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">24/7 Support</h3>
                            <p className="text-sm text-gray-500">Our dedicated support team is always here to help you, day or night.</p>
                        </li>
                        <li className="bg-gray-50 dark:bg-zinc-900 p-6 rounded-lg">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Global Access</h3>
                            <p className="text-sm text-gray-500">Trade from anywhere in the world with local currency support in 150+ countries.</p>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
