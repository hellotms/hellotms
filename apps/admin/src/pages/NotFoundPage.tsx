import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-8xl font-black text-primary/20 select-none">404</p>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Page not found</h1>
        <p className="mt-2 text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <button onClick={() => navigate(-1)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
            Go back
          </button>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors">
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
