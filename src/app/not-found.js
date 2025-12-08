import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black text-center px-6">
            <h1 className="text-9xl font-bold text-gray-200 dark:text-zinc-800">404</h1>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mt-4">Page Not Found</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-4 max-w-md">
                Oops! The page you are looking for has been removed or relocated.
            </p>
            <Link
                href="/"
                className="mt-8 px-8 py-3 bg-indigo-600 text-white text-base font-medium rounded-full hover:bg-indigo-700 transition"
            >
                Go Back Home
            </Link>
        </div>
    );
}
