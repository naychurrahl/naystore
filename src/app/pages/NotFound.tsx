import { Link } from "react-router";
import { Home, ArrowLeft } from "lucide-react";

export function NotFound() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <div className="text-center px-4">
        <div 
          className="text-9xl font-bold mb-4"
          style={{ color: 'var(--color-primary)' }}
        >
          404
        </div>
        <h1 
          className="text-4xl font-bold mb-4"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Page Not Found
        </h1>
        <p 
          className="text-lg mb-8 max-w-md mx-auto"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Sorry, we couldn't find the page you're looking for. 
          It might have been moved or deleted.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'var(--color-primary)',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
            }}
          >
            <Home className="h-5 w-5" />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'white',
              color: 'var(--color-primary)',
              border: '2px solid var(--color-primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <ArrowLeft className="h-5 w-5" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
