export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 font-mono text-center">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-4">
        <h1 className="text-xl font-bold text-green-400">Background Sync Active</h1>
        <p className="text-gray-400">The frontend has been intentionally disabled.</p>
        <p className="text-gray-500 text-sm">
          A Node.js backend daemon is running continuously, polling LeetCode for new
          accepted submissions and pushing them to your GitHub repository automatically.
        </p>
        <p className="text-xs text-gray-600 mt-8 pt-8 border-t border-gray-800">
          Configure credentials in your environment variables to begin.
        </p>
      </div>
    </div>
  );
}
