import { useLocation, Link } from 'react-router-dom';

const Breadcrumbs = () => {
  const location = useLocation();
  // Get the path as an array of strings
  const pathnames = location.pathname.split('/').filter((x) => x);


  const EXCLUDED_SEGMENTS = ['station'];

  // Function to 'humanize' a path segment (e.g., 'add-document' becomes 'Add Document')
  const formatSegment = (segment) => {
    const decodedSegment = decodeURIComponent(segment);
    const words = decodedSegment.replace(/-/g, ' ').split(' ');
    return words.map(word => {
      if (!word) return ''; 
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  const filteredPathnames = pathnames.filter(segment => 
    !EXCLUDED_SEGMENTS.includes(segment)
  );

  const isHomePage = filteredPathnames.length === 0 && location.pathname === '/';
  if (isHomePage) { return null }
  
  return (
    <div className="text-sm breadcrumbs">
      <ul>
        {/* Always start with Home */}
        <li>
          <Link to="/">Home</Link>
        </li>
        
        {filteredPathnames.map((value, index) => {
          // Build the path up to the current segment
          const to = `${filteredPathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === filteredPathnames.length - 1;
          const label = formatSegment(value);

          return (
            <li key={to}>
              {/* If it's the last item, don't make it a link */}
              {isLast ? (
                // Use a span or just the text for the current page
                <span className='card bg-primary text-primary-content px-2'>{label}</span>
              ) : (
                // Use a Link for intermediate items
                <Link to={to}>{label}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Breadcrumbs;