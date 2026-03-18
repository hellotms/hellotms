import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { HeroSlider } from '@/components/HeroSlider';
import { HeroSlide } from '@hellotms/shared';
import { LogOut, ArrowRight, Sparkles } from 'lucide-react';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const [heroSlider, setHeroSlider] = useState<HeroSlide[]>([]);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('site_settings').select('hero_slider').eq('id', 1).single();
      if (data && data.hero_slider) {
        setHeroSlider(data.hero_slider);
      }
    }
    fetchSettings();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Hero Slider Background */}
      <div className="absolute inset-0 z-0">
        <HeroSlider slides={heroSlider} />
      </div>

      {/* Main Content */}
      <div className="w-full max-w-[95vw] md:max-w-5xl relative z-10 animate-fade-up flex flex-col items-center">
        <div className="text-center mb-8 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white mb-4 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-[11px] font-normal uppercase tracking-[0.2em]">The Marketing Solution</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-lg leading-tight whitespace-nowrap overflow-visible">
            Hello, {profile?.name || 'Admin'}
          </h1>
          <p className="text-base text-white/80 font-medium drop-shadow-sm mt-3">
            What would you like to do today?
          </p>
        </div>

        {/* Continue Button - Mini Glass Effect pushed lower */}
        <div className="flex justify-center mt-16 md:mt-24">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full transition-all shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] active:scale-[0.98] group"
          >
            Continue to Dashboard
            <div className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ArrowRight className="h-2.5 w-2.5 text-white" />
            </div>
          </button>
        </div>
      </div>

      {/* Bottom-Right Transparent Sign Out Button */}
      <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 z-50">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 bg-transparent border border-white/10 rounded-full pr-1.5 pl-4 py-1 shadow-lg hover:bg-white/5 active:scale-95 transition-all group"
        >
          <span className="text-red-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-px group-hover:text-red-300 transition-colors">
            Sign Out
          </span>
          <div className="h-6 w-6 md:h-7 md:w-7 rounded-full bg-red-500/80 flex items-center justify-center text-white shadow-inner group-hover:bg-red-500 transition-colors">
            <LogOut className="h-3 w-3 ml-0.5" />
          </div>
        </button>
      </div>
    </div>
  );
}
