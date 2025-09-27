// components/Header.jsx
import Link from "next/link";
import AuthActions from "./auth/AuthActions";

const Header = () => {
  return (
    <header className="bg-gray-800 text-white p-4 shadow-md">
      <nav className="container mx-auto flex justify-between space-x-12">
        {/* All items are in a single flex container */}
        <Link
          href="/"
          passHref
          className="text-xl font-bold hover:text-gray-300 transition-colors"
        >
          Job Search
        </Link>
        <AuthActions />
      </nav>
    </header>
  );
};

export default Header;
