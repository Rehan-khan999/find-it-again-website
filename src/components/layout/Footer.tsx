import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="py-8 border-t border-border/50 bg-background mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FindIt. A student-built, non-profit platform.
          </p>
          <Link
            to="/support"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Heart className="h-4 w-4" />
            Support This Project
          </Link>
        </div>
      </div>
    </footer>
  );
};
