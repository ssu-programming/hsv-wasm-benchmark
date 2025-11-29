import { Link, Outlet, useLocation } from "react-router-dom";
import styles from "./Layout.module.scss";

const NAV_OPTIONS = [
  { path: "/", label: "소개" },
  { path: "/control", label: "HSV 조정" },
];

const Layout = () => {
  const isActive = useLocation().pathname;
  return (
    <div className={styles.layout}>
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link to="/" className={styles.navLogo}>
            WASM Benchmark
          </Link>
          <ul className={styles.navMenu}>
            {NAV_OPTIONS.map((option) => (
              <li className={styles.navItem}>
                <Link
                  to={option.path}
                  className={`${styles.navLink} ${
                    isActive === option.path ? styles.active : ""
                  }`}
                >
                  {option.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
