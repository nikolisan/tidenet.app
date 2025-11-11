import { DateTime } from 'luxon'
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useState, useEffect, useRef } from 'react'; 

// Helper function for debouncing
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func.apply(null, args);
        }, delay);
    };
};

const DatePicker = () => {
    const { dateRange } = useAppState();
    const dispatch = useAppDispatch();
    
    const getInitialLocalValue = (dateIsoString) => 
        dateIsoString ? DateTime.fromISO(dateIsoString).toLocal().toFormat("yyyy-MM-dd'T'HH:mm") : '';

    const [localDates, setLocalDates] = useState({
        start: getInitialLocalValue(dateRange.start),
        end: getInitialLocalValue(dateRange.end)
    });

    // Sync local state when the global dateRange changes externally (e.g., station change, or initial load)
    useEffect(() => {
        setLocalDates({
            start: getInitialLocalValue(dateRange.start),
            end: getInitialLocalValue(dateRange.end)
        });
    }, [dateRange.start, dateRange.end]);

    // Debounce the actual dispatch call that updates the global state
    const debouncedDispatchRef = useRef(
        debounce((newStartISO, newEndISO) => {
            // This dispatch only runs after the user stops interacting for 500ms
            dispatch({ 
                type: 'SET_DATE_RANGE', 
                payload: { 
                    start: newStartISO, 
                    end: newEndISO 
                } 
            });
        }, 500)
    ).current;

    const handleDateChange = (event) => {
        const { name, value } = event.target;
        const field = name === 'start-date' ? 'start' : 'end';

        // 1. Update the local state immediately for input responsiveness
        setLocalDates(prev => ({
            ...prev,
            [field]: value // Store the local date string from input
        }));
        
        // 2. Prepare the new UTC ISO string for the API/global state
        let newDateISO = '';
        try {
            // Convert the local time input string back to UTC ISO string
            newDateISO = DateTime.fromFormat(value, "yyyy-MM-dd'T'HH:mm").toUTC().toISO();
        } catch (e) {
            // If the date is invalid (e.g., partial input), use the last known good value
            newDateISO = dateRange[field] || '';
        }

        // 3. Determine the current state of both dates for the debounced call
        const currentStartISO = field === 'start' ? newDateISO : (dateRange.start || '');
        const currentEndISO = field === 'end' ? newDateISO : (dateRange.end || '');

        // 4. Call the debounced function with the two dates.
        // It will only execute the dispatch once all user interaction has stopped for 500ms.
        debouncedDispatchRef(currentStartISO, currentEndISO);
    }
    
    // Use the local state directly for the input value
    const startValue = localDates.start;
    const endValue = localDates.end;

    return(
        <div className="lg:col-span-1">
            <div className='w-full max-w-md space-y-4'>
                <label className="input">
                    <span className="label">Start date</span>
                    <input name="start-date" value={startValue}  type="datetime-local" onChange={handleDateChange} />
                </label>
                <label className="input">
                    <span className="label">End date</span>
                    <input name="end-date" value={endValue}  type="datetime-local" onChange={handleDateChange} />
                </label>
            </div>
        </div>
    )
}

export default DatePicker;