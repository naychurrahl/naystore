import { APIExample } from "../components/APIExample";

export function APIDemo() {
  return (
    <div className="min-h-screen py-12" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            API Utility Demo
          </h1>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Test the API fetch utility with real endpoints
          </p>
        </div>
        <APIExample />
      </div>
    </div>
  );
}
