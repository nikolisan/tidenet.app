import Navbar from './Navbar';
import Footer from './Footer';
import Breadcrumbs from './Breadcrumb';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      {/* The Hero content section */}
      <div className="flex flex-col gap-8 ">
        <div className="hero bg-base-200 min-h-30">
          <div className="hero-content flex-col lg:flex-row md:items-start justify-start w-full container mx-auto">
            <div className='w-full'> 
              <h1 className="text-5xl font-bold">RT-Surge</h1>
              <p className="py-6 text-2xl font-light">
                near real-time tide and surge readings
              </p>
            </div>
          </div>
        </div>
      </div>
      <main className="flex-grow p-8 container mx-auto">
        <Breadcrumbs />
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;