import { useRef, useEffect, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '../context/AppContext';
import moment from 'moment';
import { ChevronsRight } from 'lucide-react';
import ScrollArea from './ScrollArea';

// Individual Station Card Component
export const StationCard = forwardRef(({ 
  station, 
  index, 
  isHovered, 
  onMouseEnter, 
  onMouseLeave, 
  onClick 
}, ref) => {
  return (
    <Link 
      to={`/station/${station.label}`} 
      onClick={() => onClick(station, index)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={ref}
    >
      <div className={`stats shadow border w-full overflow-hidden transition-colors ${
        isHovered ? 'border-secondary ring ring-secondary' : 'border-base-200 hover:border-secondary'
      }`}>
        <div className="stat">
          <div className="stat-title">{station.label}</div>
          <div className="stat-value text-primary flex items-center">
            <div className="grow">
              {station.latest_reading.toFixed(1)} m
            </div>
            <div className='text-secondary'>
              <ChevronsRight />
            </div>  
          </div>
          <div className="stat-desc">{moment.utc(station.date_time).format('D MMMM YYYY, hh:mm')}</div>
        </div>
      </div>
    </Link>
  );
});

StationCard.displayName = 'StationCard';

// Station Cards Collection Component
export const StationCardsCollection = ({ 
  stations, 
  hoveredStationId, 
  setHoveredStationId 
}) => {
  const dispatch = useAppDispatch();
  const cardRefs = useRef({});

  // Scroll to card when marker is hovered
  useEffect(() => {
    if (hoveredStationId && cardRefs.current[hoveredStationId]) {
      cardRefs.current[hoveredStationId].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [hoveredStationId]);

  const handleCardStationClick = (station, index) => {
    const selectedStationPayload = { ...station, listId: index };
    dispatch({ type: 'SELECT_STATION', payload: selectedStationPayload });
  };

  return (
    <ScrollArea className="h-[70vh] w-full">
      <div className="grid sm:grid-cols-1 min-[120rem]:grid-cols-2 gap-4 w-full pr-4">
        {stations.map((station, index) => {
          const isHovered = hoveredStationId === station.station_id;
          return (
            <StationCard
              key={station.station_id}
              station={station}
              index={index}
              isHovered={isHovered}
              onMouseEnter={() => setHoveredStationId(station.station_id)}
              onMouseLeave={() => setHoveredStationId(null)}
              onClick={handleCardStationClick}
              ref={(el) => (cardRefs.current[station.station_id] = el)}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
};
