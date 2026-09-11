import { Link } from "react-router-dom";
import { Mail, MapPin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Kiri: Logo + tagline */}
          <div className="space-y-4 md:max-w-xs">
            <Link to="/" className="inline-flex items-center gap-2 transition-all duration-200 hover:opacity-80">
              <img
                src="https://res.cloudinary.com/dwyi4d3rq/image/upload/v1765171746/ambilfoto-logo_hvn8s2.png"
                alt="AmbilFoto.id Logo"
                className="h-28 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground">
              Marketplace foto event terbesar temukan, beli, dan jual foto wisuda, konser, hingga konferensi dengan bantuan AI.
            </p>
          </div>

          {/* Tengah: Product */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-smooth">About</Link></li>
              <li><Link to="/features" className="hover:text-foreground transition-smooth">Features</Link></li>
              {/* <li><Link to="/pricing" className="hover:text-foreground transition-smooth">Pricing</Link></li> */}
            </ul>
          </div>

          {/* <div>
            <h3 className="mb-4 text-sm font-semibold">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/help" className="hover:text-foreground transition-smooth">Help Center</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-smooth">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-smooth">Terms of Service</Link></li>
            </ul>
          </div> */}

          {/* Kanan: Contact, ditaruh di pojok kanan */}
          <div className="md:text-right">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2 md:justify-end">
                <Mail className="h-4 w-4" />
                <span>info@ambilfoto.id</span>
              </li>
              <li className="flex items-center gap-2 md:justify-end">
                <MapPin className="h-4 w-4" />
                <span>Indonesia</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>© 2026 AmbilFoto.id. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};