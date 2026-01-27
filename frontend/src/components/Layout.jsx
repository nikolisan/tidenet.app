import Footer from './Footer';
import { Link, useLocation  } from "react-router";
import { Menu, Anchor, MapPin, Home, Info, ChevronsDown, ShieldX, MonitorCloud, Copyright } from "lucide-react";
import { useRef, useEffect } from 'react';

import { useAppState, useAppDispatch } from '../context/AppContext';

import ThemeToggle from './ThemeToggle';
import ScrollArea from './ScrollArea';
import Modal from './Modal';


const Sidebar = ({children}) => {
  const { stations, selectedStation } = useAppState();
  const selectedStationRef = useRef(null);

  let location = useLocation()
  const dispatch = useAppDispatch();

  const handleMenuClick = (station, index) => {
    const selectedStationPayload = { ...station, listId: index };
    dispatch({ type: 'SELECT_STATION', payload: selectedStationPayload });
  };

  // Scroll to selected station when on a station page
  useEffect(() => {
    if (selectedStation && selectedStationRef.current && location.pathname.startsWith('/station/')) {
      selectedStationRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedStation, location.pathname]);

  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer-4" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col">
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
        <div className="flex flex-col bg-base-200 w-80 min-h-screen">
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
            <li className="menu-title">Stations</li>
            <ScrollArea className="h-[calc(100vh-60vh)] md:h-[calc(100vh-50vh)] lg:h-[calc(100vh-40vh)]">
            {stations.map((station, index) => (
              <li 
                key={station.station_id}  
                className={`rounded-lg text-lg ${decodeURI(location.pathname) === `/station/${station.label}` ? "menu-active" : ""}`}
                ref={selectedStation?.station_id === station.station_id ? selectedStationRef : null}
              >
                <Link to={`/station/${station.label}`} onClick={() => handleMenuClick(station, index)}>
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
            <Link className="btn w-full justify-start font-normal btn-ghost" to='/third-party'>
              <MonitorCloud className="mr-2 h-4 w-4" />
              3rd Party Software
            </Link>
            <Link className="btn w-full justify-start font-normal btn-ghost" to='/toc'>
              <ShieldX className="mr-2 h-4 w-4" />
              Terms and Conditions
            </Link>
            <Link className="btn w-full justify-start font-normal btn-ghost" to='/license'>
              <Copyright className="mr-2 h-4 w-4" />
              MIT License
            </Link>
            <button className="btn w-full justify-start font-normal btn-ghost" onClick={()=>document.getElementById('my_modal_5').showModal()}>
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
      <dialog id="my_modal_5" className="modal modal-bottom sm:modal-middle">
        <Modal />
      </dialog>
    </div>
  );

}



const Layout = ({ children }) => {
  return (
    <Sidebar>
      <main className="flex-grow px-8 py-4 container mx-auto overflow-auto">
        {children}
      </main>
      <Footer className="mt-auto" />
    </Sidebar>
  );
};

export default Layout;