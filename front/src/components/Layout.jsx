import Navbar from './Navbar';
import Footer from './Footer';
import { Link, useLocation  } from "react-router";
import { Menu, Anchor, MapPin, Home, Info, ChevronsDown } from "lucide-react";

import { useAppState, useAppDispatch } from '../context/AppContext';

import Breadcrumbs from './Breadcrumb';
import ThemeToggle from './ThemeToggle';
import ScrollArea from './ScrollArea';


const Sidebar = ({children}) => {
  const { stations, appTheme } = useAppState();
  console.log(appTheme)
  let location = useLocation()
  console.log(location)
  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer-4" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col h-screen">
        {/* Navbar */}
        <nav className="navbar w-full bg-base-200 lg:hidden border-b border-base-300">
          {/* Sidebar toggle icon */}
          <label htmlFor="my-drawer-4" aria-label="open sidebar" className="btn btn-square btn-ghost">
            <Menu />
          </label>
          <Link to="/">
            <h2 className="px-4 text-2xl font-bold tracking-tight text-primary flex items-center gap-3 cursor-pointer">
              <Anchor className="h-6 w-6" />
              TideNet
            </h2>
          </Link>
        </nav>
        {/* Page content here */}
        <div className="flex-grow flex flex-col">
          {children}
        </div>
      </div>

      <div className="drawer-side border-r border-base-300 z-40">
        <label htmlFor="my-drawer-4" aria-label="close sidebar" className="drawer-overlay"></label>
        <div className="flex flex-col bg-base-200 h-screen w-80">
          <Link to="/">
              <h2 className="px-4 my-3 text-2xl font-bold tracking-tight text-primary flex items-center gap-3 cursor-pointer">
                <Anchor className="h-6 w-6" />
                TideNet
              </h2>
          </Link>
          <Link to="/">
            <button className={`btn w-full justify-start font-normal text-lg ${location.pathname === "/" ? "btn-active" : "btn-ghost"}`}>
              <Home className="mr-2 h-4 w-4" />
              Overview
            </button>
          </Link>
          <ul className="menu w-full flex-grow">
            <li class="menu-title">Stations</li>
            <ScrollArea className="h-[calc(100vh-50vh)]">
            {stations.map((station, index) => (
              <li className={`rounded-lg text-lg ${decodeURI(location.pathname) === `/station/${station.label}` ? "menu-active" : ""}`}>
                <Link key={station.station_id} to={`/station/${station.label}`}>
                  <MapPin className="mr-2 h-4 w-4 opacity-70" />
                  {station.label}
                </Link>
              </li>
            ))}
            </ScrollArea>
            <div className="flex justify-center py-2">
              <ChevronsDown className='text-primary bounce-slow'/>
            </div>
          </ul>
          <div className="border-t border-base-300 mb-10">
            <button className="btn w-full justify-start font-normal btn-ghost">
              <Info className="mr-2 h-4 w-4" />
              About
            </button>
            <div className="px-6 py-4 flex flex-col gap-4">
              <p className="text-xs text-muted-foreground font-medium">Appearance</p>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}



const Layout = ({ children }) => {
  return (
    <div className="flex flex-col h-screen">
      {/* <Navbar /> */}
      <Sidebar>
        <main className="flex-grow px-8 py-4 container mx-auto overflow-auto">
          <Breadcrumbs />
          {children}
        </main>
        <Footer className="mt-auto" />
      </Sidebar>
    </div>
  );
};

export default Layout;