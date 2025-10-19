import React, { useRef, useEffect } from 'react';
import { useAppDispatch } from '../context/AppContext';

const CallyRangePicker = () => {
  const calendarRef = useRef(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const calendarElement = calendarRef.current;
    if (!calendarElement) return;

    // Handler for the custom 'calendar-range' event [10]
    const handleRangeChange = (event) => {
      const { start, end } = event.detail; // Payload structure from Cally
      
      // Dispatch the new date range to the global state
      dispatch({ 
        type: 'SET_DATE_RANGE', 
        payload: { start: start.toISOString().split('T'), end: end.toISOString().split('T') } 
      });
    };

    // Manually attach the native DOM event listener [11]
    calendarElement.addEventListener('calendar-range', handleRangeChange);

    // Cleanup: Remove the event listener when the component unmounts [11]
    return () => {
      calendarElement.removeEventListener('calendar-range', handleRangeChange);
    };
  }, [dispatch]);

  return (
    <div className="card bg-base-200 shadow-xl p-6">
      <h2 className="text-xl font-bold text-red-600 mb-4">Cally calendar with calendar-range</h2>
      <p className="text-red-600 mb-4">
        This will be used to refetch selected range from api
      </p>
      {/* Use useRef to get a reference to the custom element */}
      {/* The 'cally' class is styled by DaisyUI (see index.css) [12] */}
      <cally-calendar 
        ref={calendarRef} 
        selection-mode="range" 
        class="cally"
      ></cally-calendar>
    </div>
  );
};

export default CallyRangePicker;