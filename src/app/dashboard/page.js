import Link from "next/link";

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <main className="max-w-6xl mx-auto px-6 py-16">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                        <p className="text-sm text-gray-500">Overview of markets and quick actions</p>
                    </div>
                    <Link href="/" className="text-sm text-gray-500 hover:text-indigo-600">← Back to Markets</Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-800">
                        <h3 className="text-sm font-medium text-gray-500">Total Markets</h3>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">—</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-800">
                        <h3 className="text-sm font-medium text-gray-500">Top Gainers (24h)</h3>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">—</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-800">
                        <h3 className="text-sm font-medium text-gray-500">Top Losers (24h)</h3>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">—</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h2>
                    <div className="flex gap-4 flex-wrap">
                        <Link href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">View Markets</Link>
                        <Link href="/settings" className="px-4 py-2 border rounded-lg">Settings</Link>
                        <Link href="/about" className="px-4 py-2 border rounded-lg">About</Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
